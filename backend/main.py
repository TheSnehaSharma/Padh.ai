import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Phidata Imports
from phi.agent import Agent
from phi.model.groq import Groq
from phi.tools.duckduckgo import DuckDuckGo
from phi.tools.calculator import Calculator

# --- 1. Setup & Vector Store ---

app = FastAPI(title="Exam Acceleration Engine API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Allow localhost:3000 and all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB PersistentClient
CHROMA_DB_DIR = "./chroma_data"
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# Create or get collection
COLLECTION_NAME = "exam_engine"
# Use SentenceTransformer for local embeddings
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Custom embedding function for ChromaDB
class LocalEmbeddingFunction(chromadb.EmbeddingFunction):
    def __call__(self, input: chromadb.Documents) -> chromadb.Embeddings:
        embeddings = embedding_model.encode(input)
        return embeddings.tolist()

embedding_func = LocalEmbeddingFunction()
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_func
)

# Text Splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

# --- 2. The OCR & Ingestion Pipeline ---

async def extract_text_with_gemini_vision(pdf_bytes: bytes) -> str:
    """
    STUB: Extracts text from PDF using Google Gemini 1.5 Flash Vision API.
    """
    # Mock return
    return """
    Thermodynamics is the branch of physics that deals with heat, work, and temperature, and their relation to energy, entropy, and the physical properties of matter and radiation.
    
    The First Law of Thermodynamics states that energy cannot be created or destroyed in an isolated system.
    Formula: ΔU = Q - W
    
    The Second Law of Thermodynamics states that the entropy of any isolated system always increases.
    Formula: ΔS >= 0
    
    Carnot Cycle: An ideal reversible closed thermodynamic cycle. Four stages:
    1. Isothermal Expansion
    2. Adiabatic Expansion
    3. Isothermal Compression
    4. Adiabatic Compression
    
    Efficiency of Carnot Engine: η = 1 - (Tc / Th)
    """

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(...)  # PYQs, Syllabus, Reference Book, Teacher's Notes
):
    try:
        content = await file.read()
        
        # 1. OCR Extraction (Stub)
        extracted_text = await extract_text_with_gemini_vision(content)
        
        # 2. Chunking
        chunks = text_splitter.split_text(extracted_text)
        
        # 3. Store in ChromaDB
        ids = [f"{file.filename}_{i}" for i in range(len(chunks))]
        metadatas = [{"source_file": file.filename, "category": category} for _ in chunks]
        
        collection.add(
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )
        
        return {"message": f"Successfully processed {file.filename}", "chunks_count": len(chunks)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. Targeted RAG & Generation Pipeline ---

def search_pyqs(topic: str, n_results: int = 5) -> List[str]:
    """
    Queries ChromaDB for Previous Year Questions (PYQs) related to the topic.
    """
    results = collection.query(
        query_texts=[topic],
        n_results=n_results,
        where={"category": "PYQs"}
    )
    return results['documents'][0] if results['documents'] else []

def search_study_materials(topic: str, n_results: int = 5) -> List[str]:
    """
    Queries ChromaDB for study materials (Reference Books, Teacher's Notes).
    """
    results = collection.query(
        query_texts=[topic],
        n_results=n_results,
        where={"category": {"$in": ["Reference Book", "Teacher's Notes"]}}
    )
    return results['documents'][0] if results['documents'] else []

# ... (imports)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("Warning: 'groq' module not found.")

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Groq client
client = None
if GROQ_AVAILABLE:
    try:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if api_key:
            client = Groq(api_key=api_key)
            print(f"Groq client initialized with API key: {api_key[:4]}...{api_key[-4:]}")
        else:
            print("Warning: GROQ_API_KEY not found or empty.")
    except Exception as e:
        print(f"Error initializing Groq client: {e}")

# ...

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok", 
        "groq_available": GROQ_AVAILABLE, 
        "api_key_configured": client is not None
    }

# --- 4. Groq Generation Functions ---

def generate_analysis(pyq_context: str) -> Dict[str, Any]:
    if not client:
        raise HTTPException(status_code=503, detail="Groq client not initialized or API key missing.")
    
    # ... (rest of function)
    """
    Analyzes PYQs to generate exam insights.
    """
    system_prompt = """
    Analyze the provided Previous Year Questions (PYQs) and return a JSON object with the following structure:
    {
        "totalQuestions": "string",
        "yearsAppeared": "string",
        "avgMarks": "string",
        "subtopicDistribution": [{"name": "string", "percentage": number}],
        "mostAskedQuestions": [{"id": number, "question": "string", "frequency": number, "years": "string", "marks": number, "type": "string"}]
    }
    Ensure the analysis is based on the provided context.
    """
    
    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"PYQ Context: {pyq_context}"}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(completion.choices[0].message.content)

def generate_questions(context: str) -> List[Dict[str, Any]]:
    if not client:
        raise HTTPException(status_code=503, detail="Groq client not initialized.")
    """
    Generates practice questions based on the context.
    """
    system_prompt = """
    Generate practice questions based on the provided context. 
    Return a JSON object with a key 'questions' containing a list of objects.
    Each object should have:
    - id: string (e.g., "q1")
    - category: string ("Short", "Medium", or "Long")
    - question: string
    - marks: number
    """
    
    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context: {context}"}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(completion.choices[0].message.content).get("questions", [])

def generate_answers(questions: List[Dict[str, Any]], study_context: str) -> List[Dict[str, Any]]:
    if not client:
        raise HTTPException(status_code=503, detail="Groq client not initialized.")
    """
    Answers the generated questions using the study context.
    """
    questions_str = json.dumps(questions)
    system_prompt = """
    Answer the following questions using the provided study context.
    Return a JSON object with a key 'answers' containing a list of objects.
    Each object should have:
    - id: string (matching the question id)
    - answer: string (concise answer)
    """
    
    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Questions: {questions_str}\nStudy Context: {study_context}"}
        ],
        response_format={"type": "json_object"}
    )
    
    answers_map = {a['id']: a['answer'] for a in json.loads(completion.choices[0].message.content).get("answers", [])}
    
    # Merge answers
    for q in questions:
        q['answer'] = answers_map.get(q['id'], "Answer not generated.")
        
    return questions

# --- 5. Bringing it together ---

class GenerateRequest(BaseModel):
    topic: str

class ChatRequest(BaseModel):
    query: str
    context: Optional[str] = ""

@app.get("/api/topics")
async def get_topics():
    """
    STUB: Returns a list of topics. In a real app, this would query the database.
    """
    return [
        {"id": "t1", "name": "Thermodynamics Laws", "frequency": 95, "color": "text-rose-500"},
        {"id": "t2", "name": "Carnot Cycle", "frequency": 88, "color": "text-orange-500"},
        {"id": "t3", "name": "Entropy & Enthalpy", "frequency": 75, "color": "text-amber-500"},
        {"id": "t4", "name": "Rankine Cycle", "frequency": 60, "color": "text-yellow-500"},
        {"id": "t5", "name": "Heat Transfer", "frequency": 45, "color": "text-emerald-500"},
        {"id": "t6", "name": "Fluid Mechanics", "frequency": 30, "color": "text-blue-500"},
        {"id": "t7", "name": "Refrigeration", "frequency": 25, "color": "text-indigo-500"},
    ]

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not client:
        return {"response": "I'm sorry, the GROQ_API_KEY is not configured or the client failed to initialize. I cannot answer your question at the moment."}

    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": "You are a helpful exam assistant. Answer the user's question using the provided context or general knowledge."},
                {"role": "user", "content": request.query}
            ]
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"response": "I encountered an error while processing your request."}

@app.post("/api/generate-pass-pack")
async def generate_pass_pack(request: GenerateRequest):
    topic = request.topic
    
    # 1. Retrieve Context
    pyq_context = search_pyqs(topic)
    study_context = search_study_materials(topic)
    
    # Combine context for general use
    rag_context = f"PYQs: {pyq_context}\nStudy Material: {study_context}"
    
    try:
        if not client:
            raise Exception("Groq client not initialized")

        # 2. Generate Analysis
        analysis = generate_analysis(pyq_context if pyq_context else f"Topic: {topic}")
        
        # 3. Generate Questions
        questions = generate_questions(rag_context if rag_context.strip() else f"Topic: {topic}")
        
        # 4. Generate Answers
        practice_questions = generate_answers(questions, study_context if study_context else f"Topic: {topic}")
        
        # 5. Construct Response (Mocking Mindmap/Audio for now)
        return {
            "topic": topic,
            "analysis": analysis,
            "practice": practice_questions,
            "mindmap": {
                "nodes": [
                    {"id": "root", "type": "input", "data": {"label": topic}, "position": {"x": 250, "y": 0}, "style": {"background": "hsl(var(--primary))", "color": "hsl(var(--primary-foreground))", "borderRadius": "12px", "padding": "12px 24px", "fontWeight": "bold", "width": 220, "textAlign": "center"}},
                    {"id": "sub1", "data": {"label": "Key Concept 1"}, "position": {"x": 50, "y": 150}, "style": {"background": "hsl(var(--card))", "border": "1px solid hsl(var(--border))", "borderRadius": "12px", "padding": "12px", "width": 150, "textAlign": "center"}},
                    {"id": "sub2", "data": {"label": "Key Concept 2"}, "position": {"x": 450, "y": 150}, "style": {"background": "hsl(var(--card))", "border": "1px solid hsl(var(--border))", "borderRadius": "12px", "padding": "12px", "width": 150, "textAlign": "center"}},
                ],
                "edges": [
                    {"id": "e1", "source": "root", "target": "sub1", "type": "smoothstep", "animated": True},
                    {"id": "e2", "source": "root", "target": "sub2", "type": "smoothstep", "animated": True},
                ],
                "notes": {
                    "root": {"title": topic, "content": ["Main topic overview.", "Key importance."]},
                    "sub1": {"title": "Key Concept 1", "content": ["Definition.", "Application."]},
                    "sub2": {"title": "Key Concept 2", "content": ["Formula.", "Example."]},
                }
            },
            "audio": {
                "title": "Crash Course: " + topic,
                "transcript": [
                    {"time": 0, "text": f"Welcome to this crash course on {topic}."},
                    {"time": 30, "text": "Let's start with the key concepts."},
                    {"time": 60, "text": "Now moving to the practice questions."},
                ],
                "chapters": [
                    {"id": 1, "title": "Introduction", "duration": "0:30"},
                    {"id": 2, "title": "Core Concepts", "duration": "5:00"},
                ]
            }
        }
        
    except Exception as e:
        print(f"Agent execution skipped: {e}")
        
        # Return Mock JSON Response
        return {
            "topic": topic,
            "analysis": {
                "totalQuestions": "156",
                "yearsAppeared": "10",
                "avgMarks": "7.2",
                "subtopicDistribution": [
                    {"name": "First Law", "percentage": 45},
                    {"name": "Second Law", "percentage": 35},
                    {"name": "Zeroth Law", "percentage": 20},
                ],
                "mostAskedQuestions": [
                    {"id": 1, "question": "Derive SFEE for a nozzle.", "frequency": 7, "years": "2023, 2021, 2018", "marks": 10, "type": "Derivation"},
                    {"id": 2, "question": "Explain Kelvin-Planck statement.", "frequency": 5, "years": "2022, 2019", "marks": 5, "type": "Theory"},
                ]
            },
            "practice": [
                {"id": "q1", "category": "Short", "question": "Define Zeroth Law.", "marks": 2, "answer": "Thermal equilibrium definition."},
                {"id": "q2", "category": "Long", "question": "Derive First Law for open system.", "marks": 10, "answer": "SFEE derivation steps."},
                {"id": "q3", "category": "Medium", "question": "Why is Carnot cycle ideal?", "marks": 5, "answer": "Reversibility and friction-less assumptions."},
                {"id": "q4", "category": "Long", "question": "Draw PV and TS diagrams for Carnot cycle.", "marks": 10, "answer": "Step-by-step diagram guide."},
            ],
            "mindmap": {
                "nodes": [
                    {"id": "root", "type": "input", "data": {"label": topic}, "position": {"x": 250, "y": 0}, "style": {"background": "hsl(var(--primary))", "color": "hsl(var(--primary-foreground))", "borderRadius": "12px", "padding": "12px 24px", "fontWeight": "bold", "width": 220, "textAlign": "center"}},
                    {"id": "sub1", "data": {"label": "Key Concept 1"}, "position": {"x": 50, "y": 150}, "style": {"background": "hsl(var(--card))", "border": "1px solid hsl(var(--border))", "borderRadius": "12px", "padding": "12px", "width": 150, "textAlign": "center"}},
                    {"id": "sub2", "data": {"label": "Key Concept 2"}, "position": {"x": 450, "y": 150}, "style": {"background": "hsl(var(--card))", "border": "1px solid hsl(var(--border))", "borderRadius": "12px", "padding": "12px", "width": 150, "textAlign": "center"}},
                ],
                "edges": [
                    {"id": "e1", "source": "root", "target": "sub1", "type": "smoothstep", "animated": True},
                    {"id": "e2", "source": "root", "target": "sub2", "type": "smoothstep", "animated": True},
                ],
                "notes": {
                    "root": {"title": topic, "content": ["Main topic overview.", "Key importance."]},
                    "sub1": {"title": "Key Concept 1", "content": ["Definition.", "Application."]},
                    "sub2": {"title": "Key Concept 2", "content": ["Formula.", "Example."]},
                }
            },
            "audio": {
                "title": "Crash Course: " + topic,
                "transcript": [
                    {"time": 0, "text": f"Welcome to this crash course on {topic}."},
                    {"time": 30, "text": "Let's start with the First Law."},
                    {"time": 60, "text": "Now moving to the Second Law and Entropy."},
                ],
                "chapters": [
                    {"id": 1, "title": "Introduction", "duration": "0:30"},
                    {"id": 2, "title": "Core Concepts", "duration": "5:00"},
                ]
            }
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
