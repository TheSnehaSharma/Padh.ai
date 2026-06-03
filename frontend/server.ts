import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import cors from "cors";
import helmet from "helmet";
import { callGemini, callGroq, models } from "./server/utils/llmClient";
import { generateSingleTopic, getPreGeneratedTopic, generatePodcast } from "./server/services/bulkGenerator";
import { processPipeline } from "./server/services/pipeline";
import fs from "fs";

dotenv.config();

const rootDir = process.cwd();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

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
      fileSize: 100 * 1024 * 1024,
    }
  });

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  let globalContext = "";
  let currentTopics: any[] = [];
  let isProcessing = false;
  
  let globalOrganizedPYQs: Record<string, string[]> = {};
  let globalAnalysisResult: any[] = [];

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", isProcessing });
  });

  app.get("/api/topics", (req, res) => {
    res.json(currentTopics);
  });

const chunkStore = new Map<string, {
  chunks: Buffer[], 
  received: number, 
  total: number, 
  filename: string, 
  category: string 
}>();

  app.post("/api/upload_chunk", upload.single("chunk"), (req, res) => {
    try {
      const { uuid, chunkIndex, totalChunks, filename, category } = req.body;
      if (!chunkStore.has(uuid)) {
        chunkStore.set(uuid, { chunks: [], received: 0, total: parseInt(totalChunks), filename, category });
      }
      const fileData = chunkStore.get(uuid)!;
      if (req.file && req.file.buffer) {
        fileData.chunks[parseInt(chunkIndex)] = req.file.buffer;
        fileData.received++;
      }
      res.json({ success: true, received: fileData.received, total: fileData.total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/process_chunks", express.json(), async (req, res) => {
    try {
      const { fileRefs } = req.body;
      if (!fileRefs || fileRefs.length === 0) {
        return res.status(400).json({ error: "No files references provided" });
      }

      const fileData = fileRefs.map((uuid: string) => {
        const data = chunkStore.get(uuid);
        if (!data) throw new Error(`Missing chunk data for ${uuid}`);
        return {
          buffer: Buffer.concat(data.chunks),
          originalname: data.filename,
          category: data.category,
          mimetype: 'application/pdf'
        };
      });

      // Cleanup
      fileRefs.forEach((uuid: string) => chunkStore.delete(uuid));

      console.log(`Received bulk chunked upload of ${fileData.length} files. Starting pipeline...`);
      isProcessing = true;
      currentTopics = [{
          id: `temp-${Date.now()}`,
          name: `Processing Pipeline...`,
          frequency: 0,
          color: "text-slate-400 animate-pulse"
      }];

      setImmediate(async () => {
        try {
          const { topicsList, organizedPYQs, analysisResult, globalContext: gc } = await processPipeline(fileData);
          globalContext = gc;
          globalOrganizedPYQs = organizedPYQs;
          globalAnalysisResult = analysisResult;
          
          currentTopics = topicsList.map((t: string, i: number) => {
             const pyqCount = organizedPYQs[t]?.length || 0;
             let importance = "Low";
             if (pyqCount >= 5) importance = "High";
             else if (pyqCount >= 2) importance = "Medium";
             
             return {
                id: `topic-${i}-${Date.now()}`,
                name: t,
                frequency: pyqCount, // Note: now represents PYQ count, not percentage
                importance: importance,
                color: importance === "High" ? "text-rose-500" : importance === "Medium" ? "text-orange-500" : "text-blue-500"
             };
          });

        } catch (error) {
          console.error(`[Background] Pipeline failed:`, error);
          currentTopics = currentTopics.map(t => ({ ...t, name: `Failed: Pipeline Error`, color: "text-red-500" }));
        } finally {
          isProcessing = false;
        }
      });

      let checkAttempts = 0;
      const checkTopics = setInterval(() => {
        checkAttempts++;
        if (!isProcessing || currentTopics.length > 1 || checkAttempts > 15) {
           clearInterval(checkTopics);
           res.json({ 
             message: "Upload successful. Topics are ready for exploration.", 
             topics: currentTopics 
           });
        }
      }, 1000);

    } catch (error: any) {
      console.error("Process chunks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy fallback endpoint
  app.post("/api/upload", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const categories = [].concat(req.body.categories || []); // Ensure array
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const fileData = files.map((f, i) => ({
        ...f,
        category: categories[i] || "Syllabus"
      }));

      console.log(`Received bulk upload of ${files.length} files. Starting pipeline...`);
      isProcessing = true;
      currentTopics = [{
          id: `temp-${Date.now()}`,
          name: `Processing Pipeline...`,
          frequency: 0,
          color: "text-slate-400 animate-pulse"
      }];

      setImmediate(async () => {
        try {
          const { topicsList, organizedPYQs, analysisResult, globalContext: gc } = await processPipeline(fileData);
          globalContext = gc;
          globalOrganizedPYQs = organizedPYQs;
          globalAnalysisResult = analysisResult;
          
          currentTopics = topicsList.map((t: string, i: number) => {
             const pyqCount = organizedPYQs[t]?.length || 0;
             let importance = "Low";
             if (pyqCount >= 5) importance = "High";
             else if (pyqCount >= 2) importance = "Medium";
             
             return {
                id: `topic-${i}-${Date.now()}`,
                name: t,
                frequency: pyqCount, // Note: now represents PYQ count, not percentage
                importance: importance,
                color: importance === "High" ? "text-rose-500" : importance === "Medium" ? "text-orange-500" : "text-blue-500"
             };
          });

          // Removed generateAllPassPacks! LLMs are called ONLY on click.
        } catch (error) {
          console.error(`[Background] Pipeline failed:`, error);
          currentTopics = currentTopics.map(t => ({ ...t, name: `Failed: Pipeline Error`, color: "text-red-500" }));
        } finally {
          isProcessing = false;
        }
      });

      // Give it 10s to try and resolve topics immediately if fast, otherwise return early
      let checkAttempts = 0;
      const checkTopics = setInterval(() => {
        checkAttempts++;
        if (!isProcessing || currentTopics.length > 1 || checkAttempts > 15) {
          clearInterval(checkTopics);
          res.json({ 
            message: "Upload successful. Topics are ready for exploration.", 
            topics: currentTopics 
          });
        }
      }, 1000);

    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/topic/:topicName", async (req, res) => {
    const topicName = req.params.topicName;
    const data = getPreGeneratedTopic(topicName);
    
    if (data && !data.error) {
      return res.json(data);
    }
    
    try {
      // Generate on-demand if it hasn't been generated yet or if it previously had an error
      const result = await generateSingleTopic(topicName, globalContext, globalOrganizedPYQs, globalAnalysisResult);
      res.json(result);
    } catch (error: any) {
      console.error("On-demand generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate topic." });
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
    const duration = req.body.duration || 10;
    
    try {
      const data = getPreGeneratedTopic(topicName);
      if (!data) return res.status(404).json({error: "Topic not generated"});
      
      const audioResult = await generatePodcast(topicName, globalContext, duration);
      res.json(audioResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' ? "Internal Server Error" : err.message
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(rootDir, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(rootDir, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
