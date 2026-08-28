"""Ticket CRUD endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_project, get_current_user
from app.schemas.common import build_pagination
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.services.ticket_service import TicketService

router = APIRouter()


@router.get("")
async def list_tickets(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    type: Optional[str] = Query(None),
    priority: Optional[str] = None,
    assigned_to: Optional[UUID] = None,
    created_by: Optional[UUID] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """List tickets for the current project with filters, sorting, and pagination."""
    service = TicketService()
    tickets, total = await service.list_by_project(
        project_id=project_id,
        page=page,
        page_size=page_size,
        status=status,
        ticket_type=type,
        priority=priority,
        assigned_to=assigned_to,
        created_by=created_by,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return {
        "data": tickets,
        "pagination": build_pagination(total, page, page_size).model_dump(),
    }


@router.post("", status_code=201)
async def create_ticket(
    payload: TicketCreate,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Create a new ticket in the current project."""
    service = TicketService()
    ticket = await service.create(payload, user_id=user["id"], project_id=project_id)
    return {"data": ticket, "message": "Ticket created"}


@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: UUID,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Get a ticket by ID with full details (scoped to the current project)."""
    service = TicketService()
    ticket = await service.get_by_id(ticket_id, project_id=project_id)
    return {"data": ticket, "message": "Success"}


@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: UUID,
    payload: TicketUpdate,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Update a ticket (partial update, scoped to the current project)."""
    service = TicketService()
    ticket = await service.update(
        ticket_id, payload, user_id=user["id"], project_id=project_id
    )
    return {"data": ticket, "message": "Ticket updated"}


@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: UUID,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> None:
    """Delete a ticket (creator or admin only, scoped to the current project)."""
    service = TicketService()
    await service.delete(ticket_id, user=user, project_id=project_id)
    return None
