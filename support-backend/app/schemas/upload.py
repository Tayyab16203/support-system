"""File upload schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
]

MAX_FILE_SIZE = 52_428_800  # 50MB


class PresignedUrlRequest(BaseModel):
    """Schema for requesting a presigned upload URL."""

    ticket_id: UUID
    file_name: str = Field(..., min_length=1, max_length=255)
    content_type: str
    file_size: int = Field(..., gt=0, le=MAX_FILE_SIZE)


class UploadConfirm(BaseModel):
    """Schema for confirming a completed upload."""

    ticket_id: UUID
    s3_key: str
    file_name: str
    content_type: str
    file_size: int


class AttachmentResponse(BaseModel):
    """Schema for attachment in API responses."""

    id: UUID
    ticket_id: UUID
    file_name: str
    s3_key: str
    content_type: str
    file_size: int
    download_url: Optional[str] = None
    uploaded_at: datetime