"""
Authentication service — business logic for user registration, login, and token refresh.
Routes call this service; no business logic lives in route handlers.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import TokenResponse, UserRegister, UserResponse
from app.utils.exceptions import InvalidCredentialsError, UserAlreadyExistsError


async def register_user(data: UserRegister, db: AsyncSession) -> TokenResponse:
    """
    Register a new user.
    - Checks for duplicate email
    - Hashes password with bcrypt
    - Creates user record
    - Returns JWT token pair
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user is not None:
        raise UserAlreadyExistsError()

    # Create user with hashed password
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate token pair
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


async def authenticate_user(email: str, password: str, db: AsyncSession) -> TokenResponse:
    """
    Authenticate a user by email and password.
    Returns JWT token pair on success.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


async def refresh_access_token(refresh_token_str: str, db: AsyncSession) -> TokenResponse:
    """
    Issue a new access token using a valid refresh token.
    """
    payload = decode_token(refresh_token_str)

    if payload.get("type") != "refresh":
        raise InvalidCredentialsError()

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise InvalidCredentialsError()

    new_access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user),
    )
