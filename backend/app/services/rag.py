"""
RAG Service — SEO Expert Knowledge Base
────────────────────────────────────────
Vector search over Google Search Central docs via ChromaDB + SentenceTransformers.
Uses Gemini 2.5 Flash with agentic tool-calling for audit + knowledge lookup.
"""
import os
import numpy as np
import pickle
import logging
import chromadb
from sentence_transformers import SentenceTransformer
from google import genai
from google.genai import types, errors

from app.services.audit import perform_audit

logger = logging.getLogger(__name__)

# ── Resolve paths relative to this file ──
_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_SERVICES_DIR, "models")

# ── Load embedding model ──
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# ── Load Gemini client ──
_gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
gemini_client = genai.Client(api_key=_gemini_api_key) if _gemini_api_key else None

# ── Load metadata + vectors ──
_metadata_path = os.path.join(_MODELS_DIR, "metadata.pkl")
_vectors_path = os.path.join(_MODELS_DIR, "vectors.npy")

if os.path.exists(_metadata_path) and os.path.exists(_vectors_path):
    metadata = pickle.load(open(_metadata_path, "rb"))
    vectors = np.load(_vectors_path)
    logger.info(f"Loaded {len(metadata)} metadata chunks and vectors of shape {vectors.shape}")
else:
    metadata = []
    vectors = np.array([])
    logger.warning("RAG models not found — knowledge base will be empty")

# ── Setup ChromaDB ──
_chroma_path = os.path.join(_MODELS_DIR, "chroma_db")
client = chromadb.PersistentClient(path=_chroma_path)
collection = client.get_or_create_collection(
    name="seo_rag",
    metadata={"hnsw:space": "cosine"}
)

# Populate on first run
if collection.count() == 0 and len(metadata) > 0:
    logger.info("ChromaDB empty → Populating...")
    ids = [m["id"] for m in metadata]
    texts = [m["text"] for m in metadata]
    metadatas = [{"source": m["source"], "index": i} for i, m in enumerate(metadata)]
    collection.add(
        ids=ids,
        documents=texts,
        metadatas=metadatas,
        embeddings=vectors.tolist()
    )
    logger.info(f"Inserted {len(ids)} chunks into ChromaDB.")


def search_knowledge_base(query: str) -> str:
    """Searches the Google Search Central RAG knowledge base for specific SEO documentation."""
    logger.info(f"Vector Search Query: '{query}'")
    query_vec = embedder.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_vec,
        n_results=3
    )

    documents = results["documents"][0]
    return "\n\n".join(documents)


def generate_answer(query: str, history: list = None) -> str:
    """Generate SEO answer using Gemini Agentic Loop with tool-calling."""
    if not gemini_client:
        return "⚠️ **Configuration Error:** GEMINI_API_KEY is not set. Please add it to your .env file."

    # 1. Build history string
    history_string = ""
    if history:
        history_string = "Previous Conversation:\n" + "\n".join(
            [f"User: {h['question']}\nAssistant: {h['answer']}" for h in history]
        ) + "\n\n"

    system_instruction = f"""
You are a concise SEO expert assistant. Keep ALL answers short and direct.

RULES:
- Give brief, actionable answers. No filler. No lengthy explanations.
- NEVER mention sources, file names, or where you got the information.
- Use bullet points for lists. Keep each point to one line.
- For general questions: answer in 2-5 bullet points max.

WHEN A URL IS PROVIDED:
1. Run `perform_audit` on the URL.
2. Run `search_knowledge_base` ONCE with a short query about the main issues found.
3. Give a tight audit summary: list the issues found as P0/P1/P2 priorities with one-line fixes.

{history_string}
"""

    # 2. Create a chat session with tool-calling
    chat = gemini_client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[perform_audit, search_knowledge_base],
            temperature=0.2,
            max_output_tokens=500,
        )
    )

    # 3. Send message with rate-limit handling
    try:
        response = chat.send_message(query)
        return response.text
    except errors.ClientError as e:
        if "429" in str(e) or "quota" in str(e).lower() or "exhausted" in str(e).lower():
            return "⚠️ **API Rate Limit Exceeded:** The free-tier Gemini API quota has been exhausted. Please wait a minute and try again."
        return f"⚠️ **Error during analysis:** {str(e)}"
    except Exception as e:
        return f"⚠️ **Unexpected Error:** {str(e)}"
