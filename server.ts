import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import multer from "multer";
import cors from "cors";
import helmet from "helmet";
import { callGemini, callGroq, models } from "./server/utils/llmClient";
import { extractFlatTaxonomy } from "./server/services/taxonomy";
import { generateAllPassPacks, getPreGeneratedTopic } from "./server/services/bulkGenerator";
import { runPythonAnalysis } from "./server/services/pythonAnalysis";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for Vite dev server compatibility
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  }
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// In-memory store for raw text context
let globalContext = "";
let currentTopics: any[] = [];
let isProcessing = false;

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", isProcessing });
});

app.get("/api/topics", (req, res) => {
  res.json(currentTopics);
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const category = req.body.category;
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`Received upload: ${file.originalname} (${category})`);

    // Add a placeholder topic immediately so the UI shows something is happening
    const tempId = `temp-${Date.now()}`;
    const placeholderTopic = {
      id: tempId,
      name: `Processing ${file.originalname}...`,
      frequency: 0,
      color: "text-slate-400 animate-pulse"
    };
    
    currentTopics = [...currentTopics, placeholderTopic];

    // Start the heavy processing in the background to avoid proxy timeouts
    setImmediate(async () => {
      isProcessing = true;
      try {
        // 1. OCR / Text Extraction using Gemini Vision
        const imagePart = {
          inlineData: {
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype,
          },
        };

        const ocrResult = await callGemini({
          contents: {
            role: "user",
            parts: [
              imagePart,
              { text: "Extract all text from this document. If it's a question paper, extract each question clearly. If it's a syllabus, extract the topics and subtopics." },
            ],
          },
        });

        const extractedText = ocrResult.text || "";
        globalContext += `\n\n[FILE: ${file.originalname} CATEGORY: ${category}]\n${extractedText}`;

        // 2. Segregation using SLM (Groq Llama)
        let topics: string[] = [];
        if (category === "Syllabus") {
          topics = await extractFlatTaxonomy(extractedText);
        } else {
          const segregationPrompt = `
            Based on the following extracted text from a Question Paper, identify the main topics covered.
            EXTRACTED TEXT:
            ${extractedText.substring(0, 10000)}
            
            Return ONLY a JSON object with a 'topics' key containing an array of strings representing the topics.
          `;
          
          try {
            const segregationResult = await callGroq({
              messages: [{ role: "user", content: segregationPrompt }],
              model: models.GROQ_LLAMA,
              response_format: { type: "json_object" }
            });
            
            const text = segregationResult.choices[0].message.content || "{}";
            const parsed = JSON.parse(text);
            topics = parsed.topics || [file.originalname.replace(".pdf", "")];
          } catch (e) {
            console.error("Segregation failed:", e);
            topics = [file.originalname.replace(".pdf", "")];
          }
        }

        // 3. Python Analysis
        const topicsData = topics.map(t => ({ name: t, pyqs: [] }));
        let analysisResults: any = [];
        try {
          analysisResults = await runPythonAnalysis(topicsData);
        } catch (e) {
          console.error("Python analysis failed, using fallback:", e);
          analysisResults = topics.map(t => ({ topic: t, stats: { frequency: 50, importance: "Medium" } }));
        }

        // 4. Update current topics (Replace placeholder)
        const newTopics = topics.map((t, i) => {
          const analysis = analysisResults.find((a: any) => a.topic === t);
          return {
            id: `topic-${i}-${Date.now()}`,
            name: t,
            frequency: analysis?.stats?.frequency || 100,
            importance: analysis?.stats?.importance || "Medium",
            color: i % 3 === 0 ? "text-rose-500" : i % 3 === 1 ? "text-orange-500" : "text-blue-500"
          };
        });

        // Remove the placeholder and add the real topics
        currentTopics = currentTopics.filter(t => t.id !== tempId).concat(newTopics);

        // 5. Trigger Bulk Pre-Generation (Notes using Groq)
        await generateAllPassPacks(topics, globalContext);
        
      } catch (error) {
        console.error(`[Background] Pipeline failed for ${file.originalname}:`, error);
        // Mark placeholder as failed
        currentTopics = currentTopics.map(t => 
          t.id === tempId ? { ...t, name: `Failed: ${file.originalname}`, color: "text-red-500" } : t
        );
      } finally {
        isProcessing = false;
      }
    });

    // Return immediately to the frontend
    res.json({ 
      message: "Upload successful. Processing started in background.", 
      topics: currentTopics 
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/topic/:topicName", (req, res) => {
  const topicName = req.params.topicName;
  const data = getPreGeneratedTopic(topicName);
  
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: "Topic content not yet generated or not found." });
  }
});

app.post("/api/chat", async (req, res) => {
  const { query, context } = req.body;
  
  try {
    const response = await callGroq({
      messages: [{ role: "user", content: `Context: ${context || globalContext}\n\nUser Question: ${query}` }],
      model: models.GROQ_LLAMA
    });
    
    res.json({ response: response.choices[0].message.content });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/audio/:topicName", async (req, res) => {
  const topicName = req.params.topicName;
  
  try {
    res.json({
      title: topicName,
      chapters: [
        { id: 1, title: "Introduction", duration: "0:30" },
        { id: 2, title: "Deep Dive", duration: "2:00" }
      ],
      transcript: [
        { time: 0, text: `Welcome to the study session on ${topicName}.` }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? "Internal Server Error" : err.message
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
