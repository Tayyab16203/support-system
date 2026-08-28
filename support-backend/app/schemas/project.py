"""Project request/response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""

    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    jira_project_key: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    is_public: bool = False
    email_enabled: bool = True


class ProjectUpdate(BaseModel):
    """Schema for updating a project (partial update)."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    jira_project_key: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    is_public: Optional[bool] = None
    email_enabled: Optional[bool] = None


class ProjectResponse(BaseModel):
    """Schema for project in API responses."""

    id: UUID
    name: str
    description: Optional[str] = None
    jira_project_key: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    is_public: bool
    email_enabled: bool
    created_at: datetime
    updated_at: datetime