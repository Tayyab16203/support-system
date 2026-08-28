"""User schemas."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """User role enum."""

    ADMIN = "admin"
    USER = "user"


class UserResponse(BaseModel):
    """Schema for user in API responses."""

    id: UUID
    cognito_sub: str
    email: str
    name: str
    role: str
    email_notifications: bool
    saved_filters: list[Any] = []
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email_notifications: Optional[bool] = None


class AdminUserCreate(BaseModel):
    """Schema for an admin creating a new user."""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.USER


class UserRoleUpdate(BaseModel):
    """Schema for updating a user's role."""

    role: UserRole