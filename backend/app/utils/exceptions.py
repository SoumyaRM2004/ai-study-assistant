"""
Custom exception classes for the application.
Provides structured error handling across all modules.
"""

from fastapi import HTTPException, status


class UserAlreadyExistsError(HTTPException):
    """Raised when attempting to register with an existing email."""

    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )


class InvalidCredentialsError(HTTPException):
    """Raised when login credentials are incorrect."""

    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


class DocumentNotFoundError(HTTPException):
    """Raised when a requested document doesn't exist or isn't owned by the user."""

    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )


class DocumentProcessingError(HTTPException):
    """Raised when document processing fails."""

    def __init__(self, detail: str = "Document processing failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        )


class InvalidFileTypeError(HTTPException):
    """Raised when uploaded file is not a PDF."""

    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported",
        )


class FileTooLargeError(HTTPException):
    """Raised when uploaded file exceeds max size."""

    def __init__(self, max_mb: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {max_mb}MB",
        )


class RateLimitExceededError(HTTPException):
    """Raised when user exceeds their daily AI request quota."""

    def __init__(self):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily AI request limit exceeded. Try again tomorrow.",
        )
