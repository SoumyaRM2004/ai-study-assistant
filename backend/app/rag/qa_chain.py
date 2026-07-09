"""
RAG Q&A chain — the core intelligence of the chat system.
Retrieves relevant document chunks and generates answers using Gemini LLM.
"""

import logging
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import get_settings
from app.rag.embedder import embed_query
from app.rag.vector_store import search_similar

logger = logging.getLogger(__name__)
settings = get_settings()

# System prompt enforcing document-only answers with source attribution
SYSTEM_PROMPT = """You are an AI study assistant helping students learn from their uploaded documents.

RULES:
1. Answer ONLY based on the provided document context below. Do NOT use any external knowledge.
2. If the document does not contain enough information to answer the question, respond with:
   "The document does not contain enough information to answer this question."
3. Always cite the page number(s) where you found the information.
4. Be clear, concise, and educational in your explanations.
5. Use bullet points and structured formatting when it improves readability.
6. If the student asks a follow-up question, use the conversation history for continuity.

DOCUMENT CONTEXT:
{context}

CONVERSATION HISTORY:
{history}
"""

USER_PROMPT = "{question}"


def _build_context(search_results: list[dict]) -> str:
    """Format retrieved chunks into a context string for the LLM prompt."""
    if not search_results:
        return "No relevant document content found."

    context_parts = []
    for i, result in enumerate(search_results, 1):
        page = result.get("page_number", "?")
        text = result.get("text", "")
        score = result.get("score", 0)
        context_parts.append(
            f"[Chunk {i} | Page {page} | Relevance: {score:.2f}]\n{text}"
        )

    return "\n\n---\n\n".join(context_parts)


def _format_history(history: list[dict]) -> str:
    """Format conversation history for the LLM prompt."""
    if not history:
        return "No previous conversation."

    parts = []
    for msg in history[-5:]:  # Last 5 messages for context window
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        parts.append(f"{role.upper()}: {content}")

    return "\n".join(parts)


def _get_llm() -> ChatGoogleGenerativeAI:
    """Create a configured Gemini LLM instance."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.3,
        max_output_tokens=2048,
    )


def ask_question(
    question: str,
    document_id: str,
    conversation_history: Optional[list[dict]] = None,
    top_k: int = 5,
) -> dict:
    """
    Full RAG pipeline:
    1. Embed the user's question
    2. Search for similar chunks in the document
    3. Build context from retrieved chunks
    4. Generate answer using Gemini with source attribution

    Args:
        question: The user's question.
        document_id: The document to search within.
        conversation_history: Previous Q&A pairs for context continuity.
        top_k: Number of chunks to retrieve.

    Returns:
        Dict with 'answer', 'sources' (page numbers + snippets), 'chunks_used'.
    """
    logger.info(f"RAG query for document {document_id}: {question[:100]}...")

    # Step 1: Embed the question
    query_embedding = embed_query(question)

    # Step 2: Retrieve similar chunks
    search_results = search_similar(
        query_embedding=query_embedding,
        document_id=document_id,
        top_k=top_k,
    )

    # Step 3: Build context and history
    context = _build_context(search_results)
    history = _format_history(conversation_history or [])

    # Step 4: Generate answer
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", USER_PROMPT),
    ])

    llm = _get_llm()
    chain = prompt | llm | StrOutputParser()

    answer = chain.invoke({
        "context": context,
        "history": history,
        "question": question,
    })

    # Build source citations
    sources = []
    seen_pages = set()
    for result in search_results:
        page = result.get("page_number", 0)
        if page not in seen_pages:
            seen_pages.add(page)
            sources.append({
                "page_number": page,
                "snippet": result.get("text", "")[:200],
                "relevance_score": result.get("score", 0),
            })

    logger.info(
        f"Generated answer ({len(answer)} chars) from {len(search_results)} chunks"
    )

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(search_results),
    }
