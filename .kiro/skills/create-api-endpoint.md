---
name: Create API Endpoint
description: Skill for creating new FastAPI endpoints following the project's layered architecture pattern
---

# Skill: Create API Endpoint

## When to Use

Use this skill when:
- Adding a new API endpoint to the backend
- Creating a new resource with CRUD operations
- Adding a new action endpoint (e.g., bulk operations, search)

## Architecture Pattern

Always follow the layered pattern:

```
Endpoint (Router) → Service → Repository → Supabase
```

- **Endpoint:** Thin HTTP handler. Receives request, validates via schema, calls service, returns response.
- **Service:** Business logic. Orchestrates repos and integrations. Never imports from `fastapi`.
- **Repository:** Data access. Supabase queries. Returns domain objects.

## Implementation Steps

### Step 1: Define Schema (`backend/app/schemas/`)

Create request and response Pydantic models:

```python
# backend/app/schemas/resource.py
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None

class ResourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None

class ResourceResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

class ResourceListResponse(BaseModel):
    data: List[ResourceResponse]
    pagination: PaginationMeta
```

### Step 2: Create Repository (`backend/app/db/repositories/`)

```python
# backend/app/db/repositories/resource_repo.py
from app.db.repositories.base_repo import BaseRepository
from uuid import UUID
from typing import Optional

class ResourceRepo(BaseRepository):
    table_name = "resources"

    async def get_by_project(self, project_id: UUID, page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
        """Get resources filtered by project with pagination."""
        offset = (page - 1) * page_size
        # Query Supabase with filters
        response = await self.client.table(self.table_name)\
            .select("*", count="exact")\
            .eq("project_id", str(project_id))\
            .range(offset, offset + page_size - 1)\
            .execute()
        return response.data, response.count
```

### Step 3: Create Service (`backend/app/services/`)

```python
# backend/app/services/resource_service.py
from uuid import UUID
from app.schemas.resource import ResourceCreate, ResourceUpdate
from app.db.repositories.resource_repo import ResourceRepo
from app.audit.logger import AuditLogger

class ResourceService:
    def __init__(self):
        self.repo = ResourceRepo()
        self.audit = AuditLogger()

    async def create(self, data: ResourceCreate, user_id: UUID, project_id: UUID) -> dict:
        """Create a resource with audit logging."""
        record = {
            **data.model_dump(),
            "project_id": str(project_id),
            "created_by": str(user_id),
        }
        result = await self.repo.create(record)

        # Audit log
        await self.audit.log(
            actor_id=user_id,
            action="resource.created",
            resource_type="resource",
            resource_id=result["id"],
            project_id=project_id,
        )

        return result
```

### Step 4: Create Endpoint (`backend/app/api/v1/endpoints/`)

```python
# backend/app/api/v1/endpoints/resources.py
from fastapi import APIRouter, Depends, status
from uuid import UUID
from app.schemas.resource import ResourceCreate, ResourceResponse, ResourceListResponse
from app.services.resource_service import ResourceService
from app.dependencies import get_current_user, get_current_project
from app.models.user import User

router = APIRouter(prefix="/resources", tags=["resources"])

@router.get("", response_model=ResourceListResponse)
async def list_resources(
    page: int = 1,
    page_size: int = 20,
    user: User = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
):
    """List resources for the current project."""
    service = ResourceService()
    data, total = await service.list(project_id=project_id, page=page, page_size=page_size)
    return ResourceListResponse(
        data=data,
        pagination={"total": total, "page": page, "page_size": page_size, "total_pages": -(-total // page_size)}
    )

@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    data: ResourceCreate,
    user: User = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
):
    """Create a new resource."""
    service = ResourceService()
    result = await service.create(data=data, user_id=user.id, project_id=project_id)
    return result
```

### Step 5: Register Router

In `backend/app/api/v1/router.py`:

```python
from app.api.v1.endpoints.resources import router as resources_router

api_router = APIRouter()
api_router.include_router(resources_router)
```

### Step 6: Write Tests

```python
# backend/tests/api/test_resources.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_resource(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/resources",
        json={"name": "Test Resource", "description": "A test"},
        headers={**auth_headers, "X-Project-ID": "project-uuid"},
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Test Resource"

@pytest.mark.asyncio
async def test_create_resource_validation_error(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/resources",
        json={"name": "X"},  # Too short
        headers=auth_headers,
    )
    assert response.status_code == 400
```

## Checklist for Every New Endpoint

- [ ] Schema defined with proper validation (min/max, enums, required fields)
- [ ] Repository method filters by `project_id` (multi-tenant)
- [ ] Service contains business logic (not in endpoint or repo)
- [ ] Endpoint uses `Depends(get_current_user)` for auth
- [ ] Endpoint uses `Depends(get_current_project)` for project scoping
- [ ] Admin-only endpoints check `user.role == "admin"`
- [ ] Audit log written for all mutations (create, update, delete)
- [ ] Proper HTTP status codes (201 create, 204 delete, 400 validation, 404 not found)
- [ ] Response follows standard format: `{"data": ..., "message": "..."}`
- [ ] Error responses follow format: `{"error": "CODE", "message": "...", "details": {...}}`
- [ ] Tests cover: happy path, validation errors, auth errors, not found
- [ ] Router registered in `api/v1/router.py`
- [ ] API documentation updated in `docs/API_SPEC.md`

## Common Dependencies

```python
from app.dependencies import (
    get_current_user,       # Returns authenticated User, 401 if invalid token
    get_current_project,    # Returns project_id from X-Project-ID header
    get_admin_user,         # Returns User if admin, 403 otherwise
)
```

## Response Helpers

```python
from app.schemas.common import PaginationMeta

def paginate(data: list, total: int, page: int, page_size: int) -> dict:
    return {
        "data": data,
        "pagination": PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=-(-total // page_size)
        )
    }
```
