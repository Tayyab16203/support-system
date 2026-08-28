"""Authentication request/response schemas."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Email + password login payload."""

    email: EmailStr
    password: str = Field(min_length=1)


class NewPasswordRequest(BaseModel):
    """Completes a NEW_PASSWORD_REQUIRED challenge from a prior login."""

    email: EmailStr
    new_password: str = Field(min_length=8)
    session: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    """Logout payload carrying the access token to revoke."""

    access_token: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """Successful authentication tokens."""

    access_token: str
    id_token: str
    refresh_token: Optional[str] = None
    expires_in: int
    token_type: str = "Bearer"


class ChallengeResponse(BaseModel):
    """Returned when Cognito requires a follow-up challenge (e.g. new password)."""

    challenge: str
    session: str
