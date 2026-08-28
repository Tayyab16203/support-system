"""Activity timeline schemas."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ActivityActionType(str, Enum):
    """Activity action type enum."""

    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    UPDATED = "updated"
    COMMENTED = "commented"
    FILE_UPLOADED = "file_uploaded"
    FILE_DELETED = "file_deleted"
    ASSIGNED = "assigned"


class ActorSummary(BaseModel):
    """Minimal actor info for activity responses."""

    id: UUID
    name: str
    email: str


class ActivityResponse(BaseModel):
    """Schema for activity timeline entry."""

    id: UUID
    ticket_id: UUID
    action_type: ActivityActionType
    actor: Optional[ActorSummary] = None
    old_value: Optional[dict[str, Any]] = None
    new_value: Optional[dict[str, Any]] = None
    comment: Optional[str] = None
    created_at: datetime


class CommentCreate(BaseModel):
    """Schema for adding a comment."""

    comment: str = Field(..., min_length=1, max_length=5000)