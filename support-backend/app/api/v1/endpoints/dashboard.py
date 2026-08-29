"""Dashboard and analytics endpoints."""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/public")
async def get_public_dashboard(
    project_id: Optional[UUID] = Query(
        None, description="Filter by a public project (public projects only)"
    ),
    date_from: Optional[date] = Query(
        None, description="Start date (inclusive). Defaults to 30 days ago."
    ),
    date_to: Optional[date] = Query(
        None, description="End date (inclusive). Defaults to today."
    ),
) -> dict:
    """Get public KPI metrics (no auth required).

    Aggregates tickets across public projects into summary KPIs, breakdowns by
    type/priority, a created-vs-completed time series, and per-project totals.
    Non-public or unknown ``project_id`` values return an empty payload.
    """
    service = DashboardService()
    metrics = await service.get_public_metrics(
        project_id=project_id,
        date_from=date_from,
        date_to=date_to,
    )
    return {"data": metrics}


@router.get("/insights")
async def get_insights(
    project_id: Optional[UUID] = Query(
        None, description="Filter by a single project (any project)."
    ),
    date_from: Optional[date] = Query(
        None, description="Start date (inclusive). Defaults to 30 days ago."
    ),
    date_to: Optional[date] = Query(
        None, description="End date (inclusive). Defaults to today."
    ),
    user: dict = Depends(get_current_user),
) -> dict:
    """Get personal analytics (protected).

    Scoped to the authenticated user: their created/assigned/completed counts,
    completion rate and average resolution time, personal velocity vs. the
    prior period, average dwell time per status, busiest weekdays, and the
    type distribution of their tickets. Supports an optional ``project_id``
    filter and a custom date range.
    """
    service = DashboardService()
    insights = await service.get_insights(
        user_id=UUID(str(user["id"])),
        project_id=project_id,
        date_from=date_from,
        date_to=date_to,
    )
    return {"data": insights}
