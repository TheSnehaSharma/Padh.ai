import { callGemini, callGroq, models } from "../utils/llmClient";
import { runPythonAnalysis } from "./pythonAnalysis";
import fs from "fs";

export async function processPipeline(files: any[]) {
    // 1. Group files by category
    const syllabusFiles = files.filter(f => f.category === "Syllabus");
    const pyqFiles = files.filter(f => f.category === "PYQs");
    const noteFiles = files.filter(f => f.category === "Teacher's Notes" || f.category === "Reference Book");

    // Helper: Extract text from PDF files using Gemini Vision
    async function extractTextFromPDFs(pdfFiles: any[]) {
        let fullText = "";
        for (const file of pdfFiles) {
            try {
                let base64 = "";
                if (file.buffer) {
                    base64 = file.buffer.toString("base64");
                } else if (file.path) {
                    base64 = fs.readFileSync(file.path, { encoding: "base64" });
                }
                const imagePart = {
                    inlineData: {
                        data: base64,
                        mimeType: "application/pdf"
                    }
                };
                const ocrResult = await callGemini({
                    contents: [{
                        role: "user",
                        parts: [
                            imagePart,
                            { text: "Extract all structural text precisely from this PDF document. Do not summarize. Give the exact text." }
                        ]
                    }]
                });
                fullText += `\n[FILE: ${file.originalname}]\n${ocrResult.text || ""}\n`;
            } catch (err) {
                console.error(`Failed to extract text from ${file.originalname}`, err);
            }
        }
        return fullText;
    }

    // Step 1: Extract Syllabus and Topics
    let topicsList: string[] = [];
    let rawNotesData = "";
    let pyqText = "";
    let syllabusText = "";

    if (noteFiles.length > 0) {
        console.log("Books/Notes found. Indexing for RAG...");
        rawNotesData = await extractTextFromPDFs(noteFiles);
    }
    
    if (pyqFiles.length > 0) {
        console.log("PYQs found...");
        pyqText = await extractTextFromPDFs(pyqFiles);
    }
    
    if (syllabusFiles.length > 0) {
        console.log("Syllabus found. Extracting topics via Gemini...");
        syllabusText = await extractTextFromPDFs(syllabusFiles);
        const prompt = `Extract JSON array of main topics from this syllabus text strictly.
        TEXT:
        ${syllabusText.substring(0, 15000)}`;
        
        const res = await callGemini({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { systemInstruction: "Output raw JSON array of strings only. Do not wrap in formatting." }
        });
        
        try {
            let cleanResponse = res.text || "[]";
            const jsonMatch = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/) || cleanResponse.match(/\[([\s\S]*)\]/);
            if (jsonMatch) cleanResponse = `[${jsonMatch[1]}]`;
            topicsList = JSON.parse(cleanResponse);
        } catch (e) {
            console.error("Failed to parse topics", e);
            topicsList = ["General Coverage"];
        }
    } else if (rawNotesData.length > 0) {
        console.log("No syllabus found. Extracting topics from Notes/Books...");
        const prompt = `Extract JSON array of main chapters/topics from the index or chapter headings in this text.
        TEXT:
        ${rawNotesData.substring(0, 15000)}`;
        
        const res = await callGemini({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { systemInstruction: "Output raw JSON array of strings only. Do not wrap in formatting." }
        });
        
        try {
            let cleanResponse = res.text || "[]";
            const jsonMatch = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/) || cleanResponse.match(/\[([\s\S]*)\]/);
            if (jsonMatch) cleanResponse = `[${jsonMatch[1]}]`;
            topicsList = JSON.parse(cleanResponse);
        } catch (e) {
            console.error("Failed to parse topics", e);
            topicsList = ["General Coverage"];
        }
    } else if (pyqText.length > 0) {
        console.log("No syllabus or notes found. Extracting broad topics from PYQs...");
        const prompt = `Extract JSON array of main chapters/topics from these previous year questions. What overarching topics do they cover?
        TEXT:
        ${pyqText.substring(0, 15000)}`;
        
        const res = await callGemini({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { systemInstruction: "Output raw JSON array of strings only. Do not wrap in formatting." }
        });
        
        try {
            let cleanResponse = res.text || "[]";
            const jsonMatch = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/) || cleanResponse.match(/\[([\s\S]*)\]/);
            if (jsonMatch) cleanResponse = `[${jsonMatch[1]}]`;
            topicsList = JSON.parse(cleanResponse);
        } catch (e) {
            console.error("Failed to parse topics from PYQs", e);
            topicsList = ["General Topic"];
        }
    } else {
        topicsList = ["General Topic"];
    }

    // Ensure topics list isn't empty or invalid
    if (!Array.isArray(topicsList) || topicsList.length === 0) {
        topicsList = ["General Coverage"];
    }

    // Step 2: Process PYQs
    let organizedPYQs: Record<string, string[]> = {};
    for (const t of topicsList) organizedPYQs[t] = [];

    if (pyqText.length > 0) {
        console.log("Organizing PYQs via local SLM (Groq)...");
        
        // Use Groq to organize pyqs
        const orgPrompt = `You are a strict academic data processor. I will provide a list of Topics from the syllabus, and text extracted from Previous Year Questions (PYQs).
        Extract ALL actual questions from the PYQ TEXT.
        Assign each extracted question to the relevant topic(s) from the TOPICS list. A single question can belong to MULTIPLE topics.
        
        TOPICS: ${JSON.stringify(topicsList)}
        
        PYQ TEXT:
        ${pyqText.substring(0, 15000)}
        
        Return ONLY a JSON object where keys are topics from the list, and values are arrays of question strings. Only extract actual questions. Do not hallucinate.`;

        const orgRes = await callGroq({
            messages: [{ role: "user", content: orgPrompt }],
            model: models.GROQ_LLAMA,
            response_format: { type: "json_object" }
        });
        
        try {
            const orgData = JSON.parse(orgRes.choices[0].message.content || "{}");
            for (const t of topicsList) {
                if (orgData[t] && Array.isArray(orgData[t])) {
                    organizedPYQs[t] = orgData[t];
                }
            }
        } catch (e) {
            console.error("Failed to parse organized PYQs", e);
        }
    }

    // Step 3: Python Analysis
    const pythonInput = topicsList.map(t => ({
        name: t,
        pyqs: organizedPYQs[t] || []
    }));
    let analysisResult: any[] = [];
    try {
        console.log("Running Python analysis on PYQs...");
        analysisResult = await runPythonAnalysis(pythonInput) as any[];
    } catch (e) {
        console.error("Python analysis failed", e);
        analysisResult = pythonInput.map(p => ({
            topic: p.name,
            stats: { count: p.pyqs.length, importance: "Medium", frequency: p.pyqs.length, trend: "Stable" }
        }));
    }

    // Step 4: Notes and RAG global context limits
    // Global Context (sliced to minimize tokens)
    const globalContext = `[TOPICS]\n${JSON.stringify(topicsList)}\n\n[PYQs]\n${JSON.stringify(organizedPYQs)}\n\n[NOTES]\n${rawNotesData.substring(0, 50000)}`;

    return {
        topicsList,
        organizedPYQs,
        analysisResult,
        globalContext
    };
}
