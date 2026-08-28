"""Base repository with generic CRUD operations using Supabase."""

from math import ceil
from typing import Any, Optional
from uuid import UUID

from app.integrations.supabase.client import get_table


class BaseRepository:
    """Base repository providing generic CRUD operations against Supabase.

    Subclasses must set `table_name` to the target database table.
    """

    table_name: str = ""

    def _table(self):
        """Get the Supabase table query builder."""
        if not self.table_name:
            raise ValueError("table_name must be set on the repository subclass")
        return get_table(self.table_name)

    async def create(self, data: dict[str, Any]) -> dict:
        """Create a new record.

        Args:
            data: Dictionary of column values to insert.

        Returns:
            The created record as a dictionary.
        """
        response = self._table().insert(data).execute()
        return response.data[0] if response.data else {}

    async def get_by_id(self, record_id: UUID) -> Optional[dict]:
        """Get a single record by ID.

        Args:
            record_id: UUID of the record.

        Returns:
            Record dict or None if not found.
        """
        response = (
            self._table()
            .select("*")
            .eq("id", str(record_id))
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def list(
        self,
        filters: Optional[dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "created_at",
        order_desc: bool = True,
        select: str = "*",
    ) -> tuple[list[dict], int]:
        """List records with filtering, pagination, and sorting.

        Args:
            filters: Dict of column=value equality filters.
            page: Page number (1-indexed).
            page_size: Number of records per page.
            order_by: Column to sort by.
            order_desc: Sort descending if True.
            select: Columns to select.

        Returns:
            Tuple of (records list, total count).
        """
        offset = (page - 1) * page_size

        # Build query with count
        query = self._table().select(select, count="exact")

        # Apply equality filters
        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, str(value) if isinstance(value, UUID) else value)

        # Apply ordering
        query = query.order(order_by, desc=order_desc)

        # Apply pagination
        query = query.range(offset, offset + page_size - 1)

        response = query.execute()
        total = response.count if response.count is not None else 0
        return response.data or [], total

    async def update(self, record_id: UUID, data: dict[str, Any]) -> dict:
        """Update a record by ID.

        Args:
            record_id: UUID of the record to update.
            data: Dictionary of column values to update.

        Returns:
            The updated record as a dictionary.
        """
        # Remove None values to avoid overwriting with nulls unintentionally
        update_data = {k: v for k, v in data.items() if v is not None}

        response = (
            self._table()
            .update(update_data)
            .eq("id", str(record_id))
            .execute()
        )
        return response.data[0] if response.data else {}

    async def delete(self, record_id: UUID) -> None:
        """Delete a record by ID.

        Args:
            record_id: UUID of the record to delete.
        """
        self._table().delete().eq("id", str(record_id)).execute()

    async def count(self, filters: Optional[dict[str, Any]] = None) -> int:
        """Count records with optional filters.

        Args:
            filters: Dict of column=value equality filters.

        Returns:
            Total count of matching records.
        """
        query = self._table().select("id", count="exact")
        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, str(value) if isinstance(value, UUID) else value)
        response = query.execute()
        return response.count if response.count is not None else 0