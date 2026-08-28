"""Search and saved filters endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_project, get_current_user

router = APIRouter()


@router.get("")
async def search_tickets(
    q: str = "",
    page: int = 1,
    page_size: int = 20,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Full-text search across tickets.

    TODO: Step 9 — Implement with SearchService using PostgreSQL tsvector.
    """
    return {
        "data": [],
        "pagination": {"total": 0, "page": page, "page_size": page_size, "total_pages": 0},
    }


@router.get("/filters")
async def get_saved_filters(
    user: dict = Depends(get_current_user),
) -> dict:
    """Get saved filters for current user.

    TODO: Step 9 — Implement with SearchService.
    """
    return {"data": []}


@router.post("/filters", status_code=201)
async def save_filter(
    user: dict = Depends(get_current_user),
) -> dict:
    """Save a filter combination.

    TODO: Step 9 — Accept SavedFilterCreate schema.
    """
    return {"data": {}, "message": "Filter saved"}


@router.delete("/filters/{filter_id}", status_code=204)
async def delete_filter(
    filter_id: UUID,
    user: dict = Depends(get_current_user),
) -> None:
    """Delete a saved filter.

    TODO: Step 9 — Implement with SearchService.
    """
    return None
