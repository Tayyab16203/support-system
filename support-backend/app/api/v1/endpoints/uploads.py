"""File upload endpoints for S3 presigned URLs."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user

router = APIRouter()


@router.post("/presigned-url")
async def get_presigned_upload_url(
    user: dict = Depends(get_current_user),
) -> dict:
    """Generate a presigned S3 upload URL.

    TODO: Step 6 — Accept PresignedUrlRequest, call UploadService.
    """
    return {"data": {"upload_url": "", "s3_key": "", "expires_in": 900}}


@router.post("/confirm", status_code=201)
async def confirm_upload(
    user: dict = Depends(get_current_user),
) -> dict:
    """Confirm upload completion and create attachment record.

    TODO: Step 6 — Accept UploadConfirm schema, call UploadService.
    """
    return {"data": {}, "message": "Upload confirmed"}


@router.get("/{ticket_id}")
async def list_attachments(
    ticket_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    """List all attachments for a ticket.

    TODO: Step 6 — Implement with UploadService.
    """
    return {"data": []}


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: UUID,
    user: dict = Depends(get_current_user),
) -> None:
    """Delete an attachment.

    TODO: Step 6 — Implement with UploadService.
    """
    return None
