"""Ticket CRUD endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.dependencies import get_client_ip, get_current_project, get_current_user
from app.schemas.activity import CommentCreate
from app.schemas.common import build_pagination
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.services.activity_service import ActivityService
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
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
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
        date_from=date_from,
        date_to=date_to,
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
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
    ip_address: Optional[str] = Depends(get_client_ip),
) -> dict:
    """Create a new ticket in the current project.

    Emails all admins about the new ticket (and the assignee, if it was
    created pre-assigned) via ``background_tasks``.
    """
    service = TicketService()
    ticket = await service.create(
        payload,
        user_id=user["id"],
        project_id=project_id,
        background_tasks=background_tasks,
        ip_address=ip_address,
    )
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
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
    ip_address: Optional[str] = Depends(get_client_ip),
) -> dict:
    """Update a ticket (partial update, scoped to the current project).

    Status/assignment/completion changes trigger email notifications, which
    run on ``background_tasks`` so the response is not delayed by SES.
    """
    service = TicketService()
    ticket = await service.update(
        ticket_id,
        payload,
        user=user,
        project_id=project_id,
        background_tasks=background_tasks,
        ip_address=ip_address,
    )
    return {"data": ticket, "message": "Ticket updated"}


@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: UUID,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
    ip_address: Optional[str] = Depends(get_client_ip),
) -> None:
    """Delete a ticket (creator or admin only, scoped to the current project)."""
    service = TicketService()
    await service.delete(
        ticket_id, user=user, project_id=project_id, ip_address=ip_address
    )
    return None


@router.get("/{ticket_id}/activities")
async def list_ticket_activities(
    ticket_id: UUID,
    page: int = 1,
    page_size: int = 50,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Get the activity timeline for a ticket in chronological order.

    Verifies the ticket belongs to the current project before returning its
    timeline, then lists activities oldest-first with pagination.
    """
    ticket_service = TicketService()
    # Raises TicketNotFoundError if the ticket is missing or in another project.
    await ticket_service.get_by_id(ticket_id, project_id=project_id)

    activity_service = ActivityService()
    # The timeline shows events only; comments live in their own section.
    activities, total = await activity_service.list_activities(
        ticket_id=ticket_id, page=page, page_size=page_size, exclude_comments=True
    )
    return {
        "data": activities,
        "pagination": build_pagination(total, page, page_size).model_dump(),
    }


@router.get("/{ticket_id}/comments")
async def list_ticket_comments(
    ticket_id: UUID,
    page: int = 1,
    page_size: int = 50,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """List a ticket's comments in chronological order."""
    ticket_service = TicketService()
    # Raises TicketNotFoundError if the ticket is missing or in another project.
    await ticket_service.get_by_id(ticket_id, project_id=project_id)

    activity_service = ActivityService()
    comments, total = await activity_service.list_comments(
        ticket_id=ticket_id, page=page, page_size=page_size
    )
    return {
        "data": comments,
        "pagination": build_pagination(total, page, page_size).model_dump(),
    }


@router.post("/{ticket_id}/comments", status_code=201)
async def add_ticket_comment(
    ticket_id: UUID,
    payload: CommentCreate,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Add a comment to a ticket's timeline.

    Verifies the ticket belongs to the current project, then records a
    ``commented`` activity attributed to the current user.
    """
    ticket_service = TicketService()
    # Raises TicketNotFoundError if the ticket is missing or in another project.
    await ticket_service.get_by_id(ticket_id, project_id=project_id)

    activity_service = ActivityService()
    activity = await activity_service.add_comment(
        ticket_id=ticket_id, actor_id=user["id"], comment=payload.comment
    )
    return {"data": activity, "message": "Comment added"}
