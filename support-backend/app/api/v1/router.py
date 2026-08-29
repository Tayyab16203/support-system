"""API v1 router that aggregates all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    audit,
    auth,
    bulk,
    dashboard,
    projects,
    search,
    tickets,
    uploads,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/admin/users", tags=["admin-users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(bulk.router, prefix="/tickets/bulk", tags=["bulk"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(audit.router, prefix="/admin/audit", tags=["admin-audit"])
