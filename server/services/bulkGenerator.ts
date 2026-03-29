import { callGemini, callGroq, models } from "../utils/llmClient";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, "../../data");
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

export async function generateAllPassPacks(topics: string[], ragContext: string) {
  console.log(`Starting bulk generation for ${topics.length} topics...`);
  
  // Sequential loop to avoid rate limits and ensure "first answer first"
  for (const topic of topics) {
    try {
      // Check if already generated
      const existing = db.prepare("SELECT topic FROM passpacks WHERE topic = ?").get(topic);
      if (existing) {
        console.log(`Topic "${topic}" already pre-generated. Skipping.`);
        continue;
      }

      console.log(`Generating content for topic: ${topic}`);
      
      // Sequential generation for each topic component
      const relevantContext = getRelevantContext(topic, ragContext);
      
      const notes = await generateNotes(topic, relevantContext);
      const practice = await generatePractice(topic, relevantContext);
      const analysis = await generateAnalysis(topic, relevantContext);

      const payload = {
        topic,
        notes,
        practice,
        analysis,
        audio: {
          id: `audio-${Date.now()}`,
          title: topic,
          chapters: [],
          transcript: []
        }
      };

      db.prepare("INSERT OR REPLACE INTO passpacks (topic, payload, status) VALUES (?, ?, ?)")
        .run(topic, JSON.stringify(payload), "completed");
      
      console.log(`Successfully pre-generated topic: ${topic}`);
      
      // Mandatory wait between topics to stay well within free tier RPM limits
      await new Promise(resolve => setTimeout(resolve, 8000));
      
    } catch (error) {
      console.error(`Failed to generate topic "${topic}":`, error);
      db.prepare("INSERT OR REPLACE INTO passpacks (topic, payload, status) VALUES (?, ?, ?)")
        .run(topic, JSON.stringify({ error: "Generation failed" }), "failed");
    }
  }
  
  console.log("Bulk generation complete.");
}

async function generateNotes(topic: string, context: string) {
  const prompt = `
    Generate comprehensive study notes for the topic "${topic}" based on the provided context.
    Use Markdown format. Include key concepts, definitions, and examples.
    CONTEXT:
    ${context}
  `;

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
    return { content: "Failed to generate notes.", sources: [], isAiGenerated: true };
  }
}

async function generatePractice(topic: string, context: string) {
  const prompt = `
    Extract or generate 5-8 practice questions for the topic "${topic}" from the context.
    Include Short, Medium, and Long answer questions.
    Return a JSON object with a 'questions' key containing a list of {id, category, question, marks, answer}.
    
    CONTEXT:
    ${context}
  `;

  try {
    const result = await callGroq({
      messages: [{ role: "user", content: prompt }],
      model: models.GROQ_LLAMA,
      response_format: { type: "json_object" }
    });
    const data = JSON.parse(result.choices[0].message.content);
    return data.questions || [];
  } catch (error) {
    console.error(`Practice generation failed for ${topic}:`, error);
    return [];
  }
}

async function generateAnalysis(topic: string, context: string) {
  const prompt = `
    Provide a brief exam analysis for the topic "${topic}".
    Include estimated weightage, frequency in past years, and difficulty level.
    Return a JSON object with:
    - totalQuestions: string
    - yearsAppeared: string[]
    - avgMarks: string
    - subtopicDistribution: { name: string, percentage: number }[]
    - mostAskedQuestions: { id: string, question: string, frequency: number, years: string[], marks: number, type: string }[]
    
    CONTEXT:
    ${context}
  `;

  try {
    const result = await callGroq({
      messages: [{ role: "user", content: prompt }],
      model: models.GROQ_LLAMA,
      response_format: { type: "json_object" }
    });
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error(`Analysis generation failed for ${topic}:`, error);
    return { totalQuestions: "N/A", yearsAppeared: [], avgMarks: "N/A", subtopicDistribution: [], mostAskedQuestions: [] };
  }
}

export function getPreGeneratedTopic(topic: string) {
  const row = db.prepare("SELECT payload FROM passpacks WHERE topic = ?").get(topic);
  if (row) {
    return JSON.parse(row.payload);
  }
  return null;
}
