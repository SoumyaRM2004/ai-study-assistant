"""
Text chunking engine for the RAG pipeline.
Splits extracted PDF text into overlapping chunks with rich metadata
for high-quality semantic retrieval.
"""

import logging
import uuid
from dataclasses import dataclass, field

from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)


@dataclass
class ChunkMetadata:
    """Metadata attached to each text chunk for filtering and attribution."""
    document_id: str
    user_id: str
    page_number: int
    chunk_index: int
    total_chunks: int = 0


@dataclass
class TextChunk:
    """A single chunk of text with its metadata."""
    id: str
    text: str
    metadata: ChunkMetadata

    def to_dict(self) -> dict:
        """Convert to dictionary for vector store ingestion."""
        return {
            "id": self.id,
            "text": self.text,
            "document_id": self.metadata.document_id,
            "user_id": self.metadata.user_id,
            "page_number": self.metadata.page_number,
            "chunk_index": self.metadata.chunk_index,
            "total_chunks": self.metadata.total_chunks,
        }


# Default chunking parameters — tuned for RAG on educational content
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 200
DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""]


def create_splitter(
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    separators: list[str] | None = None,
) -> RecursiveCharacterTextSplitter:
    """
    Create a configured text splitter.
    Uses RecursiveCharacterTextSplitter which tries to split at natural
    boundaries (paragraphs → sentences → words) before resorting to
    character-level splits.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators or DEFAULT_SEPARATORS,
        length_function=len,
        is_separator_regex=False,
    )


def chunk_pages(
    pages: list[dict],
    document_id: str,
    user_id: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[TextChunk]:
    """
    Split extracted PDF pages into overlapping chunks with metadata.

    Args:
        pages: List of dicts with 'page_number' and 'text' keys
               (from ExtractionResult.pages).
        document_id: UUID of the document in the database.
        user_id: UUID of the owning user.
        chunk_size: Target chunk size in characters.
        chunk_overlap: Number of overlapping characters between chunks.

    Returns:
        List of TextChunk objects ready for embedding and vector storage.
    """
    splitter = create_splitter(chunk_size, chunk_overlap)
    all_chunks: list[TextChunk] = []
    global_index = 0

    for page_data in pages:
        page_number = page_data["page_number"]
        page_text = page_data["text"]

        if not page_text or not page_text.strip():
            continue

        # Split page text into chunks
        text_splits = splitter.split_text(page_text)

        for text in text_splits:
            if not text.strip():
                continue

            chunk = TextChunk(
                id=f"{document_id}_{global_index}",
                text=text.strip(),
                metadata=ChunkMetadata(
                    document_id=document_id,
                    user_id=user_id,
                    page_number=page_number,
                    chunk_index=global_index,
                ),
            )
            all_chunks.append(chunk)
            global_index += 1

    # Set total_chunks on all chunks now that we know the final count
    for chunk in all_chunks:
        chunk.metadata.total_chunks = len(all_chunks)

    logger.info(
        f"Document {document_id}: {len(pages)} pages → {len(all_chunks)} chunks "
        f"(size={chunk_size}, overlap={chunk_overlap})"
    )

    return all_chunks
