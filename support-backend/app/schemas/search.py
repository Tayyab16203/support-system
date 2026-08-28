"""Search and saved filter schemas."""

from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SearchParams(BaseModel):
    """Schema for search query parameters."""

    q: str = Field(..., min_length=2)
    status: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    page: int = 1
    page_size: int = 20


class SavedFilterCreate(BaseModel):
    """Schema for saving a filter combination."""

    name: str = Field(..., min_length=1, max_length=50)
    filters: dict[str, Any]


class SavedFilterResponse(BaseModel):
    """Schema for saved filter in responses."""

    id: str
    name: str
    filters: dict[str, Any]