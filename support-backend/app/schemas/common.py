"""Common schemas shared across the application."""

from typing import Any, Optional

from pydantic import BaseModel


class PaginationMeta(BaseModel):
    """Pagination metadata for list responses."""

    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper."""

    data: list[Any]
    pagination: PaginationMeta


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str


class DataResponse(BaseModel):
    """Generic single-item response wrapper."""

    data: Any
    message: str = "Success"


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: str
    message: str
    details: dict[str, Any] = {}


def build_pagination(total: int, page: int, page_size: int) -> PaginationMeta:
    """Build pagination metadata from query results.

    Args:
        total: Total number of matching records.
        page: Current page number.
        page_size: Items per page.

    Returns:
        PaginationMeta instance.
    """
    total_pages = max(1, -(-total // page_size))  # Ceiling division
    return PaginationMeta(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )