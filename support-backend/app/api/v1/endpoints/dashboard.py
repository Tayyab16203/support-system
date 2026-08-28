"""Dashboard and analytics endpoints."""

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user

router = APIRouter()


@router.get("/public")
async def get_public_dashboard() -> dict:
    """Get public KPI metrics (no auth required).

    TODO: Step 15 — Implement with DashboardService.
    """
    return {
        "data": {
            "summary": {
                "total_tickets": 0,
                "pending": 0,
                "in_progress": 0,
                "paused": 0,
                "in_review": 0,
                "completed": 0,
                "avg_resolution_hours": 0,
            },
            "by_type": [],
            "by_priority": [],
            "over_time": [],
            "by_project": [],
        }
    }


@router.get("/insights")
async def get_insights(
    user: dict = Depends(get_current_user),
) -> dict:
    """Get detailed analytics (protected).

    TODO: Step 16 — Implement with DashboardService.
    """
    return {
        "data": {
            "velocity": {},
            "avg_time_per_status": {},
            "team_workload": [],
            "busiest_days": [],
            "top_types": [],
        }
    }
