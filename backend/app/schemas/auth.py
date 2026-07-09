"""
Pydantic schemas for authentication endpoints.
Validates request bodies and shapes API responses.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Request Schemas ──────────────────────────────────────────

class UserRegister(BaseModel):
    """POST /api/auth/register request body."""
    name: str = Field(..., min_length=2, max_length=255, examples=["Soumya Mohapatra"])
    email: EmailStr = Field(..., examples=["soumya@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["secureP@ss123"])


class UserLogin(BaseModel):
    """POST /api/auth/login request body."""
    email: EmailStr = Field(..., examples=["soumya@example.com"])
    password: str = Field(..., examples=["secureP@ss123"])


class RefreshTokenRequest(BaseModel):
    """POST /api/auth/refresh request body."""
    refresh_token: str


# ── Response Schemas ─────────────────────────────────────────

class UserResponse(BaseModel):
    """User data returned in API responses (never includes password)."""
    id: UUID
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token pair returned on login/register."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
