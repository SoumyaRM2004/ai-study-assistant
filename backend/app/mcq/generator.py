"""
MCQ generation engine.
Uses Gemini LLM to generate high-quality multiple-choice questions
from document chunks with structured JSON output.
"""

import json
import logging
import re
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MCQ_GENERATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     """You are an expert educator creating assessment questions for students. 
Your task is to generate multiple-choice questions (MCQs) from the provided document content.

RULES:
1. Generate exactly {count} questions at {difficulty} difficulty level.
2. Each question must be directly answerable from the provided content.
3. Create plausible distractor options that test real understanding.
4. Use Bloom's Taxonomy: mix recall, comprehension, application, and analysis questions.
5. Each question must have exactly 4 options (A, B, C, D) with one correct answer.
6. Provide a clear explanation for the correct answer.
7. Assign a topic/concept label to each question.

OUTPUT FORMAT: Return a valid JSON array. Each element must be:
{{
    "question": "The question text",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "A",
    "explanation": "Why this answer is correct",
    "topic": "Topic or concept being tested",
    "difficulty": "{difficulty}"
}}

Return ONLY the JSON array, no markdown formatting, no code blocks, no extra text."""),
    ("human",
     "Generate {count} MCQ questions at {difficulty} difficulty from this content:\n\n{content}"),
])


def _get_llm() -> ChatGoogleGenerativeAI:
    """Create a Gemini LLM for MCQ generation."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.6,
        max_output_tokens=8192,
    )


def _extract_json_array(text: str) -> list[dict]:
    """Extract JSON array from LLM output, handling common formatting issues."""
    # Try direct parse first
    text = text.strip()
    
    # Remove markdown code blocks if present
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*$", "", text)
    text = text.strip()
    
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        elif isinstance(result, dict):
            return [result]
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON array in the text
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    
    raise ValueError(f"Could not extract valid JSON from LLM output: {text[:200]}...")


def generate_mcqs(
    content: str,
    count: int = 20,
    difficulty: str = "medium",
    max_retries: int = 2,
) -> list[dict]:
    """
    Generate MCQ questions from document content.

    Args:
        content: Concatenated text from document chunks.
        count: Number of questions to generate (20, 40, or 60).
        difficulty: Difficulty level (easy, medium, hard).
        max_retries: Number of retry attempts on failure.

    Returns:
        List of MCQ dicts with question, options, answer, explanation, topic.
    """
    llm = _get_llm()
    chain = MCQ_GENERATION_PROMPT | llm | StrOutputParser()

    # For large counts, generate in batches
    batch_size = 20
    all_mcqs = []

    for batch_start in range(0, count, batch_size):
        batch_count = min(batch_size, count - batch_start)
        
        for attempt in range(max_retries + 1):
            try:
                response = chain.invoke({
                    "count": batch_count,
                    "difficulty": difficulty,
                    "content": content[:15000],  # Limit context to avoid token limits
                })

                mcqs = _extract_json_array(response)
                all_mcqs.extend(mcqs[:batch_count])
                
                logger.info(
                    f"Generated {len(mcqs)} MCQs (batch {batch_start // batch_size + 1}, "
                    f"attempt {attempt + 1})"
                )
                break

            except Exception as e:
                logger.warning(
                    f"MCQ generation attempt {attempt + 1} failed: {e}"
                )
                if attempt == max_retries:
                    raise

    return all_mcqs[:count]
