"""
PDF text extraction engine.
Primary: PyMuPDF (fitz) — fastest, handles most PDFs well.
Fallback: pdfplumber — better for table-heavy or complex layouts.
"""

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber

logger = logging.getLogger(__name__)


@dataclass
class PageContent:
    """Extracted content from a single PDF page."""
    page_number: int
    text: str


@dataclass
class ExtractionResult:
    """Complete extraction result for an entire PDF."""
    pages: list[PageContent] = field(default_factory=list)
    total_pages: int = 0
    extraction_method: str = ""
    error: str | None = None

    @property
    def full_text(self) -> str:
        """Concatenate all page texts with page separators."""
        return "\n\n".join(
            f"[Page {p.page_number}]\n{p.text}" for p in self.pages if p.text.strip()
        )


def _clean_text(text: str) -> str:
    """
    Clean and normalize extracted text.
    Fixes common extraction artifacts without destroying structure.
    """
    if not text:
        return ""

    # Normalize unicode characters
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "--")
    text = text.replace("\u2026", "...")

    # Fix hyphenated line breaks (e.g., "docu-\nment" → "document")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Collapse multiple spaces (but preserve newlines)
    text = re.sub(r"[^\S\n]+", " ", text)

    # Collapse 3+ newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove leading/trailing whitespace per line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()


def extract_with_pymupdf(file_path: str) -> ExtractionResult:
    """
    Extract text using PyMuPDF (fitz).
    Fast and reliable for most standard PDFs.
    """
    result = ExtractionResult(extraction_method="PyMuPDF")

    try:
        doc = fitz.open(file_path)
        result.total_pages = len(doc)

        for page_num in range(len(doc)):
            page = doc[page_num]
            raw_text = page.get_text("text")
            cleaned = _clean_text(raw_text)

            result.pages.append(PageContent(
                page_number=page_num + 1,  # 1-indexed
                text=cleaned,
            ))

        doc.close()
        logger.info(
            f"PyMuPDF extracted {result.total_pages} pages from {Path(file_path).name}"
        )
    except Exception as e:
        result.error = str(e)
        logger.error(f"PyMuPDF extraction failed: {e}")

    return result


def extract_with_pdfplumber(file_path: str) -> ExtractionResult:
    """
    Extract text using pdfplumber.
    Better for table-heavy documents and complex layouts.
    Used as fallback when PyMuPDF extraction quality is poor.
    """
    result = ExtractionResult(extraction_method="pdfplumber")

    try:
        with pdfplumber.open(file_path) as pdf:
            result.total_pages = len(pdf.pages)

            for page_num, page in enumerate(pdf.pages):
                raw_text = page.extract_text() or ""
                cleaned = _clean_text(raw_text)

                result.pages.append(PageContent(
                    page_number=page_num + 1,
                    text=cleaned,
                ))

        logger.info(
            f"pdfplumber extracted {result.total_pages} pages from {Path(file_path).name}"
        )
    except Exception as e:
        result.error = str(e)
        logger.error(f"pdfplumber extraction failed: {e}")

    return result


def _extraction_quality(result: ExtractionResult) -> float:
    """
    Heuristic quality score for extraction results.
    Returns a 0.0–1.0 score based on text density and page coverage.
    """
    if not result.pages or result.total_pages == 0:
        return 0.0

    pages_with_text = sum(1 for p in result.pages if len(p.text.strip()) > 50)
    coverage = pages_with_text / result.total_pages

    avg_chars = (
        sum(len(p.text) for p in result.pages) / result.total_pages
        if result.total_pages > 0
        else 0
    )
    # Typical good extraction yields 500-3000 chars per page
    density_score = min(avg_chars / 500, 1.0)

    return (coverage * 0.6) + (density_score * 0.4)


def extract_text(file_path: str) -> ExtractionResult:
    """
    Extract text from a PDF using the best available method.

    Strategy:
    1. Try PyMuPDF first (faster)
    2. If quality is poor (<0.3 score), fall back to pdfplumber
    3. Return the better result

    Args:
        file_path: Absolute path to the PDF file.

    Returns:
        ExtractionResult with pages, metadata, and extraction method used.
    """
    path = Path(file_path)
    if not path.exists():
        return ExtractionResult(error=f"File not found: {file_path}")

    if not path.suffix.lower() == ".pdf":
        return ExtractionResult(error=f"Not a PDF file: {file_path}")

    # Try PyMuPDF first
    pymupdf_result = extract_with_pymupdf(file_path)

    if pymupdf_result.error:
        # PyMuPDF failed entirely — try pdfplumber
        logger.warning("PyMuPDF failed, falling back to pdfplumber")
        return extract_with_pdfplumber(file_path)

    # Check quality
    quality = _extraction_quality(pymupdf_result)
    logger.info(f"PyMuPDF quality score: {quality:.2f}")

    if quality < 0.3:
        # Poor quality — try pdfplumber
        logger.warning(f"PyMuPDF quality poor ({quality:.2f}), trying pdfplumber")
        plumber_result = extract_with_pdfplumber(file_path)

        if not plumber_result.error:
            plumber_quality = _extraction_quality(plumber_result)
            logger.info(f"pdfplumber quality score: {plumber_quality:.2f}")

            if plumber_quality > quality:
                return plumber_result

    return pymupdf_result
