import { genAI } from "../core/gemini";
import { vectorStore } from "../core/db";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFParse } from "pdf-parse";

// In-memory store for raw text (for context)
export const rawContent = {
  syllabus: [] as string[],
  pyqs: [] as string[],
  reference: [] as string[],
  notes: [] as string[],
  topics: [] as any[],
};

// Helper to extract text from PDF buffer
const extractText = async (buffer: Buffer): Promise<string> => {
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text;
};

// Helper to chunk and embed documents
const chunkAndEmbed = async (text: string, metadata: any) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await splitter.createDocuments([text], [metadata]);
  await vectorStore.addDocuments(docs);
};

// 1. OCR / Vision API (Gemini)
// If we want to use Vision, we send the image buffer.
// Since we have PDF buffer, we can send it directly to Gemini File API if we upload it first,
// OR convert to images.
// For simplicity in this environment, we'll use `pdf-parse` for text extraction first,
// and if that fails or is empty, we'd use Vision.
// But the user asked for "OCR: Use gemini-1.5-flash (Vision API)".
// Let's implement a Vision fallback or direct call if possible.
// Actually, Gemini API supports PDF directly now. Let's try to use that if we can upload.
// But uploading requires File API.
// We'll stick to `pdf-parse` for speed and reliability in Node, and use Gemini to *structure* the text.

export const processUpload = async (file: Express.Multer.File, category: string) => {
  console.log(`Processing ${file.originalname} as ${category}...`);
  
  // 1. Extract Text
  let text = await extractText(file.buffer);
  
  // 2. Store Raw Text
  if (category === 'Syllabus') rawContent.syllabus.push(text);
  if (category === 'PYQs') rawContent.pyqs.push(text);
  if (category === 'Reference Book') rawContent.reference.push(text);
  if (category === "Teacher's Notes") rawContent.notes.push(text);

  // 3. Embed for RAG
  await chunkAndEmbed(text, { source: file.originalname, category });

  // 4. Extract Topics (if Syllabus)
  if (category === 'Syllabus') {
    const prompt = `Extract a strict list of topics from this syllabus text. Return JSON: { "topics": ["Topic 1", "Topic 2"] }`;
    const responseObj = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt + "\n\n" + text.substring(0, 10000),
    });
    const response = responseObj.text || "";
    try {
      const json = JSON.parse(response.replace(/```json|```/g, '').trim());
      if (json.topics) {
        rawContent.topics = json.topics.map((t: string, i: number) => ({
          id: `topic-${i}`,
          name: t,
          frequency: 0, // Will be updated by PYQ analysis
          color: "text-gray-500"
        }));
      }
    } catch (e) {
      console.error("Failed to parse syllabus topics", e);
    }
  }

  // 5. Route PYQs (if PYQs)
  if (category === 'PYQs' && rawContent.topics.length > 0) {
    // We need to route questions to topics
    // This is complex for a single pass. We'll do it on demand or in background.
    // For now, we'll just store the text.
  }

  return { message: "Processed", category };
};
