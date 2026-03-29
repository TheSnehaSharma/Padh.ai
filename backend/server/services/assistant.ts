import { genAI } from "../core/gemini";
import { vectorStore } from "../core/db";
import { rawContent } from "./ingestion";
import { z } from "zod";

// Rolling Memory Manager
const memory: { role: string, content: string }[] = [];
const MAX_MESSAGES = 4;

const summarizeMemory = async (messages: { role: string, content: string }[]) => {
  const prompt = `Summarize the following conversation into a dense paragraph. Keep key facts and context.\n\n${messages.map(m => `${m.role}: ${m.content}`).join("\n")}`;
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  return response.text;
};

export const handleChat = async (query: string, context: string) => {
  // 1. Add user message
  memory.push({ role: "user", content: query });

  // 2. Check memory limit
  if (memory.length > MAX_MESSAGES) {
    const summary = await summarizeMemory(memory.slice(0, memory.length - 1));
    memory.length = 0; // Clear old
    memory.push({ role: "system", content: `Previous Context Summary: ${summary}` });
    memory.push({ role: "user", content: query });
  }

  // 3. RAG Search
  const retriever = vectorStore.asRetriever(3);
  const docs = await retriever.invoke(query);
  const ragContext = docs.map(d => d.pageContent).join("\n\n");

  // 4. Generate Response (Agentic Fallback Chain)
  // Step 1: RAG
  let source = "RAG";
  const prompt = `
    Context: ${ragContext}
    User Query: ${query}
    Task: Answer the user's question. Use the context if relevant. If context is insufficient, state "I will search the web."
  `;
  
  let responseObj = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  let response = responseObj.text || "";

  // Step 2: Web Search (Simulated via DuckDuckGo Tool call if needed)
  if (response.includes("I will search the web")) {
    source = "Web Search";
    // Simulate web search result
    const webResult = "Simulated web search result for: " + query;
    const webPrompt = `
      Web Search Result: ${webResult}
      User Query: ${query}
      Task: Answer the user's question based on the web search result.
    `;
    responseObj = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: webPrompt,
    });
    response = responseObj.text || "";
  }

  // 5. Add assistant message to memory
  memory.push({ role: "assistant", content: response });

  return {
    response,
    source,
    sourceName: source === "RAG" ? "Study Materials" : "Web Search"
  };
};
