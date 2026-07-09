"""
Pydantic schemas for document endpoints.
Validates responses and shapes API output.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    """Single document returned in API responses."""
    id: UUID
    user_id: UUID
    filename: str
    original_name: str
    status: str
    page_count: Optional[int] = None
    chunk_count: Optional[int] = None
    file_size_bytes: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""
    documents: list[DocumentResponse]
    total: int


class DocumentUploadResponse(BaseModel):
    """Response after successful upload — document is queued for processing."""
    message: str = "Document uploaded successfully. Processing will begin shortly."
    document: DocumentResponse


class DocumentDeleteResponse(BaseModel):
    """Response after document deletion."""
    message: str = "Document deleted successfully"
    document_id: UUID
