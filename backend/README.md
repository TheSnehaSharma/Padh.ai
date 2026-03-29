# Exam Acceleration Engine Backend

This is the FastAPI backend for the Exam Acceleration Engine.

## Setup

1.  **Install Python 3.10+**
2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run the Server**:
    ```bash
    python main.py
    ```
    The server will start on `http://0.0.0.0:8000`.

## Environment Variables

Create a `.env` file (or set environment variables) for the following API keys when you implement the actual calls:

-   `GEMINI_API_KEY`: For Google Gemini 1.5 Flash (OCR).
-   `GROQ_API_KEY`: For Groq API (LLM Generation).

## API Endpoints

-   `POST /api/upload`: Upload PDF documents (Syllabus, PYQs, Notes).
-   `POST /api/generate-pass-pack`: Generate the study pack for a specific topic.

## Architecture

-   **Vector Store**: ChromaDB (Persistent)
-   **Embeddings**: SentenceTransformers (all-MiniLM-L6-v2)
-   **OCR**: Gemini 1.5 Flash (Stubbed)
-   **LLM**: Groq Llama 3 (Stubbed)
