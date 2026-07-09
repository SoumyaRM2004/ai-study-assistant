"""
MCQ validation engine.
Validates generated MCQ JSON structure, deduplicates, and enforces quality gates.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = {
    "question", "option_a", "option_b", "option_c", "option_d",
    "correct_answer", "explanation", "topic", "difficulty",
}

VALID_ANSWERS = {"A", "B", "C", "D"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def validate_mcq(mcq: dict) -> tuple[bool, Optional[str]]:
    """
    Validate a single MCQ dict.
    Returns (is_valid, error_message).
    """
    # Check required fields
    missing = REQUIRED_FIELDS - set(mcq.keys())
    if missing:
        return False, f"Missing fields: {missing}"

    # Check non-empty values
    for field in REQUIRED_FIELDS:
        value = mcq.get(field, "")
        if not value or not str(value).strip():
            return False, f"Empty field: {field}"

    # Check correct answer is valid
    answer = mcq.get("correct_answer", "").upper().strip()
    if answer not in VALID_ANSWERS:
        return False, f"Invalid correct_answer: {answer}"

    # Check all options are distinct
    options = [
        mcq.get("option_a", "").strip().lower(),
        mcq.get("option_b", "").strip().lower(),
        mcq.get("option_c", "").strip().lower(),
        mcq.get("option_d", "").strip().lower(),
    ]
    if len(set(options)) < 4:
        return False, "Options are not all distinct"

    # Normalize difficulty
    difficulty = mcq.get("difficulty", "").lower().strip()
    if difficulty not in VALID_DIFFICULTIES:
        return False, f"Invalid difficulty: {difficulty}"

    return True, None


def validate_and_clean_mcqs(mcqs: list[dict]) -> list[dict]:
    """
    Validate a list of MCQs, cleaning and deduplicating them.

    Returns only valid, unique MCQs with normalized fields.
    """
    valid_mcqs = []
    seen_questions = set()
    errors = 0

    for mcq in mcqs:
        is_valid, error = validate_mcq(mcq)

        if not is_valid:
            logger.warning(f"Invalid MCQ skipped: {error}")
            errors += 1
            continue

        # Normalize fields
        question_key = mcq["question"].strip().lower()
        if question_key in seen_questions:
            logger.debug(f"Duplicate question skipped: {mcq['question'][:50]}")
            continue
        seen_questions.add(question_key)

        # Clean and normalize
        cleaned = {
            "question": mcq["question"].strip(),
            "option_a": mcq["option_a"].strip(),
            "option_b": mcq["option_b"].strip(),
            "option_c": mcq["option_c"].strip(),
            "option_d": mcq["option_d"].strip(),
            "correct_answer": mcq["correct_answer"].upper().strip(),
            "explanation": mcq["explanation"].strip(),
            "topic": mcq["topic"].strip(),
            "difficulty": mcq["difficulty"].lower().strip(),
        }
        valid_mcqs.append(cleaned)

    logger.info(
        f"Validated MCQs: {len(valid_mcqs)} valid, {errors} invalid, "
        f"{len(mcqs) - len(valid_mcqs) - errors} duplicates"
    )

    return valid_mcqs
