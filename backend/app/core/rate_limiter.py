"""
Rate limiting middleware using slowapi.
Attempts Redis-backed storage for distributed rate counting.
Falls back to in-memory storage when Redis is unavailable (development).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()


def _get_user_identifier(request) -> str:
    """
    Extract user identifier for rate limiting.
    Uses JWT user_id if authenticated, falls back to IP address.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import decode_token
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass

    return get_remote_address(request)


def _create_limiter() -> Limiter:
    """
    Create limiter with Redis storage if available,
    otherwise fall back to in-memory storage for development.
    """
    try:
        limiter = Limiter(
            key_func=_get_user_identifier,
            storage_uri=settings.REDIS_URL,
            default_limits=[],
        )
        return limiter
    except Exception:
        # Redis not available — use in-memory fallback (development only)
        limiter = Limiter(
            key_func=_get_user_identifier,
            storage_uri="memory://",
            default_limits=[],
        )
        return limiter


limiter = _create_limiter()
