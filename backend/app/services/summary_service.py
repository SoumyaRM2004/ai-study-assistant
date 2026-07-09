"""
Summary service — LLM-powered answer post-processing.
Summarize, simplify, or generate MCQs from existing AI answers.
These are direct LLM calls (no RAG retrieval needed).
"""

import logging

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_llm(temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    """Create a configured Gemini LLM instance."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=temperature,
        max_output_tokens=2048,
    )


SUMMARIZE_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are a study assistant. Summarize the following answer into concise key points. "
     "Use bullet points. Keep it clear and educational. "
     "Focus on the most important concepts and facts."),
    ("human", "Summarize this answer:\n\n{answer}"),
])

SIMPLIFY_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are a study assistant helping a student who finds the material difficult. "
     "Rewrite the following answer in simpler language. "
     "Use everyday words, short sentences, and analogies where helpful. "
     "Maintain accuracy while making it accessible to a beginner."),
    ("human", "Simplify this answer:\n\n{answer}"),
])

MCQ_FROM_ANSWER_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are an educational assessment expert. Generate exactly 3 multiple-choice questions "
     "from the following answer. For each question provide:\n"
     "- A clear question\n"
     "- Four options labeled A, B, C, D\n"
     "- The correct answer letter\n"
     "- A brief explanation\n\n"
     "Format your response as:\n"
     "Q1: [question]\n"
     "A) [option]\nB) [option]\nC) [option]\nD) [option]\n"
     "Correct: [letter]\n"
     "Explanation: [explanation]\n\n"
     "Repeat for Q2 and Q3."),
    ("human", "Generate MCQs from this content:\n\n{answer}"),
])


def summarize_answer(answer: str) -> str:
    """Summarize an AI answer into concise key points."""
    logger.info(f"Summarizing answer ({len(answer)} chars)")
    llm = _get_llm(temperature=0.2)
    chain = SUMMARIZE_PROMPT | llm | StrOutputParser()
    return chain.invoke({"answer": answer})


def simplify_answer(answer: str) -> str:
    """Rewrite an AI answer in simpler, more accessible language."""
    logger.info(f"Simplifying answer ({len(answer)} chars)")
    llm = _get_llm(temperature=0.4)
    chain = SIMPLIFY_PROMPT | llm | StrOutputParser()
    return chain.invoke({"answer": answer})


def generate_mcq_from_answer(answer: str) -> str:
    """Generate MCQs from an existing AI answer."""
    logger.info(f"Generating MCQs from answer ({len(answer)} chars)")
    llm = _get_llm(temperature=0.5)
    chain = MCQ_FROM_ANSWER_PROMPT | llm | StrOutputParser()
    return chain.invoke({"answer": answer})
