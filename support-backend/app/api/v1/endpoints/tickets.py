"""Ticket CRUD endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_project, get_current_user

router = APIRouter()


@router.get("")
async def list_tickets(
    page: int = 1,
    page_size: int = 20,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """List tickets for the current project.

    TODO: Step 5 — Implement with TicketService.
    """
    return {
        "data": [],
        "pagination": {"total": 0, "page": page, "page_size": page_size, "total_pages": 0},
    }


@router.post("", status_code=201)
async def create_ticket(
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Create a new ticket.

    TODO: Step 5 — Accept TicketCreate schema, call TicketService.
    """
    return {"data": {}, "message": "Ticket created"}


@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    """Get ticket by ID with full details.

    TODO: Step 5 — Implement with TicketService.
    """
    return {"data": {}, "message": "Success"}


@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    """Update a ticket (partial update).

    TODO: Step 5 — Accept TicketUpdate schema, call TicketService.
    """
    return {"data": {}, "message": "Ticket updated"}


@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: UUID,
    user: dict = Depends(get_current_user),
) -> None:
    """Delete a ticket.

    TODO: Step 5 — Implement with TicketService.
    """
    return None
