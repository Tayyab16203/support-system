"""Full-text search service."""

from typing import Any
from uuid import UUID

from app.core.logging import get_logger

logger = get_logger(__name__)


class SearchService:
    """Business logic for full-text search and saved filters.

    TODO: Step 9 — Implement with PostgreSQL tsvector search.
    """

    async def search(
        self,
        query: str,
        project_id: UUID,
        filters: dict[str, Any],
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        """Full-text search across tickets."""
        return [], 0

    async def get_saved_filters(self, user_id: UUID) -> list[dict]:
        """Get saved filters for a user."""
        return []

    async def save_filter(self, user_id: UUID, name: str, filters: dict[str, Any]) -> dict:
        """Save a filter combination."""
        return {}

    async def delete_filter(self, filter_id: UUID, user_id: UUID) -> None:
        """Delete a saved filter."""
        pass
