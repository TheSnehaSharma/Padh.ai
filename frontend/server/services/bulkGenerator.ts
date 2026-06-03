import { callGemini, callGroq, callGeminiTTS, models } from "../utils/llmClient";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "passpacks.db"));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS passpacks (
    topic TEXT PRIMARY KEY,
    payload TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Helper to extract only relevant context for a topic to save tokens
function getRelevantContext(topic: string, fullContext: string, maxChars: number = 4000): string {
  if (!fullContext) return "";
  
  const paragraphs = fullContext.split(/\n\s*\n/);
  const keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (keywords.length === 0) keywords.push(topic.toLowerCase());
  
  const scored = paragraphs.map(p => {
    const lowerP = p.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lowerP.includes(kw)) score += 1;
    }
    return { text: p, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  let result = "";
  for (const p of scored) {
    if (result.length + p.text.length > maxChars) break;
    if (p.score > 0 || result.length < maxChars / 2) {
      result += p.text + "\n\n";
    }
  }
  
  if (result.trim().length === 0) {
    return fullContext.substring(0, maxChars);
  }
  
  return result;
}

export async function generateSingleTopic(topic: string, ragContext: string, organizedPYQs: Record<string, string[]>, analysisResults: any[]) {
  const existing = db.prepare("SELECT topic, payload FROM passpacks WHERE topic = ?").get(topic);
  if (existing) {
    const data = JSON.parse(existing.payload);
    if (!data.error) return data;
  }

  console.log(`Generating content for topic: ${topic}`);
  try {
    const relevantContext = getRelevantContext(topic, ragContext);
    const pyqsForTopic = organizedPYQs[topic] ? organizedPYQs[topic].join("\n") : "";
    const pythonAnalysis = analysisResults.find(a => a.topic === topic);

    const notesPromise = generateNotes(topic, relevantContext);
    const practicePromise = generatePractice(topic, relevantContext, pyqsForTopic);
    
    // Run them in parallel if possible, or sequential if we want to save token bursts. 
    // The user said "Make apis occupy less token", so probably doing them sequentially is safer for rate limits.
    const notes = await notesPromise;
    const practice = await practicePromise;
    const analysis = await generateAnalysis(topic, pythonAnalysis, practice);

    let audioResult;
    try {
      audioResult = await generatePodcast(topic, relevantContext, 10);
    } catch (e) {
      audioResult = {
        id: `audio-${Date.now()}`,
        title: topic,
        chapters: [],
        transcript: []
      };
    }

    const payload = {
      topic,
      notes,
      practice,
      analysis,
      audio: audioResult
    };

    db.prepare("INSERT OR REPLACE INTO passpacks (topic, payload, status) VALUES (?, ?, ?)")
      .run(topic, JSON.stringify(payload), "completed");
    
    return payload;

  } catch (error: any) {
    console.error(`Failed to generate topic "${topic}":`, error);
    let errorMessage = "Generation failed";
    const errMsgStr = error.message || String(error);
    if (errMsgStr.includes("429") || errMsgStr.includes("Rate limit")) {
      errorMessage = "Token limit reached. Please try again after 1-2 minutes by reloading.";
    } else if (errMsgStr) {
      errorMessage = `Generation error: ${errMsgStr}`;
    }
    
    const errPayload = { error: errorMessage };
    db.prepare("INSERT OR REPLACE INTO passpacks (topic, payload, status) VALUES (?, ?, ?)")
      .run(topic, JSON.stringify(errPayload), "failed");
    throw new Error(errorMessage);
  }
}

async function generateNotes(topic: string, context: string) {
  const prompt = `Generate notes for "${topic}" based ONLY on CONTEXT. Follow markdown format. Do not hallucinate.
CONTEXT:\n${context}`;

  try {
    const result = await callGroq({
      messages: [{ role: "user", content: prompt }],
      model: models.GROQ_LLAMA
    });
    return {
      content: result.choices[0].message.content,
      sources: ["Study Materials", "AI Knowledge Base"],
      isAiGenerated: true
    };
  } catch (error) {
    console.error(`Notes generation failed for ${topic}:`, error);
    throw error;
  }
}

async function generatePractice(topic: string, context: string, pyqsContext: string = "") {
  const hasPyqs = !!pyqsContext.trim();
  const prompt = `Extract questions and answers for "${topic}".
RULES:
1. Base questions strictly on the text provided. Wait, NO AI GENERATED QUESTIONS.
2. If PYQS CONTEXT exists, extract questions from it and set source as "PYQ". Attempt to extract the year it appeared (e.g., "2023", "2022") if available in the text.
3. Extract questions from NOTES CONTEXT (e.g., exercises) and set source as "Book/Notes".
4. Do not include "[Source: ...]" in the question text.
5. Provide answers based on NOTES CONTEXT.
Output JSON schema: { "questions": [{ "id": "1", "category": "Short", "question": "...", "marks": 5, "answer": "...", "source": "PYQ", "year": "2023" }] }

PYQS CONTEXT:
${pyqsContext || "None"}

NOTES CONTEXT:
${context}`;

  try {
    const result = await callGroq({
      messages: [{ role: "user", content: prompt }],
      model: models.GROQ_LLAMA,
      response_format: { type: "json_object" }
    });
    const data = JSON.parse(result.choices[0].message.content || "{}");
    return data.questions || [];
  } catch (error) {
    console.error(`Practice generation failed for ${topic}:`, error);
    throw error;
  }
}

async function generateAnalysis(topic: string, pythonAnalysisResult: any, practiceQuestions: any[]) {
  const pyqs = (practiceQuestions || []).filter(q => q.source === "PYQ");
  
  const allYears = pyqs.map(q => q.year).filter(Boolean);
  const uniqueYears = Array.from(new Set(allYears));

  return {
    totalQuestions: pyqs.length,
    yearsAppeared: uniqueYears.length > 0 ? uniqueYears : ["Recent"],
    avgMarks: (pythonAnalysisResult?.stats?.avg_marks || "N/A").toString(),
    subtopicDistribution: [],
    mostAskedQuestions: pyqs.slice(0, 5).map((q, i) => ({
      id: i,
      question: q.question,
      frequency: 1,
      years: q.year ? [q.year] : ["Recent"],
      marks: q.marks,
      type: q.category
    }))
  };
}

export async function generatePodcast(topic: string, context: string, durationMinutes: number) {
  const words = durationMinutes * 150;
  const prompt = `Write a ${durationMinutes}m podcast script (~${words} words) for "${topic}".
RULES: Base on CONTEXT, be engaging, do NOT hallucinate.
CONTEXT:\n${context}`;

  try {
    const result = await callGroq({
      messages: [{ role: "user", content: prompt }],
      model: models.GROQ_LLAMA
    });
    const script = result.choices[0].message.content || "";
    
    // Generate text to speech
    let audioUrl = "";
    try {
      if (script.length > 0) {
        audioUrl = await callGeminiTTS(script.substring(0, 3000)); // limit length for TTS payload slightly if needed
      }
    } catch (ttsErr: any) {
      console.error("TTS generation failed:", ttsErr);
    }
    
    return {
      title: `${durationMinutes}m Summary: ${topic}`,
      chapters: [{ id: 1, title: "Summary", duration: `${durationMinutes}:00` }],
      transcript: [{ time: 0, text: script }],
      audioUrl
    };
  } catch (error) {
    throw new Error("Failed to generate podcast summary");
  }
}

export function getPreGeneratedTopic(topic: string) {
  const row = db.prepare("SELECT payload FROM passpacks WHERE topic = ?").get(topic);
  if (row) {
    return JSON.parse(row.payload);
  }
  return null;
}
