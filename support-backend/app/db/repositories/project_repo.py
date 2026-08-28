"""Project repository for data access."""

from typing import Optional

from app.db.repositories.base_repo import BaseRepository


class ProjectRepo(BaseRepository):
    """Data access layer for projects."""

    table_name = "projects"

    async def get_by_name(self, name: str) -> Optional[dict]:
        """Find a project by name.

        Args:
            name: Project name to search for.

        Returns:
            Project dict or None.
        """
        response = (
            self._table()
            .select("*")
            .eq("name", name)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def list_public(self) -> list[dict]:
        """List all public projects (for the public dashboard).

        Returns:
            List of public project dicts.
        """
        response = (
            self._table()
            .select("*")
            .eq("is_public", True)
            .order("name")
            .execute()
        )
        return response.data or []