import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { embeddings } from "./gemini";

// Mocking ChromaDB with MemoryVectorStore for this environment
// In production, this would be `Chroma` from `langchain/vectorstores/chroma`
export const vectorStore = new MemoryVectorStore(embeddings);

// We'll use separate "collections" by filtering metadata or just separate stores if needed
// For simplicity, we'll use one store and filter by `type` (syllabus, pyq, notes, reference)
export const getRetriever = (filter?: any) => {
  return vectorStore.asRetriever({
    filter: filter,
    k: 5, // Top 5 chunks
  });
};
