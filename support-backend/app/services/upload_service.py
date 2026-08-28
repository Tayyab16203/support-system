"""File upload service for S3 operations and attachment records."""

from uuid import UUID, uuid4

from app.core.exceptions import (
    ForbiddenError,
    NotFoundError,
    TicketNotFoundError,
    ValidationError,
)
from app.core.logging import get_logger
from app.db.repositories.attachment_repo import AttachmentRepo
from app.db.repositories.ticket_repo import TicketRepo
from app.integrations.aws.s3 import s3_client
from app.schemas.upload import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE

logger = get_logger(__name__)


class AttachmentNotFoundError(NotFoundError):
    """Attachment not found."""

    error_code = "ATTACHMENT_NOT_FOUND"
    message = "Attachment not found"

    def __init__(self, attachment_id: str) -> None:
        super().__init__(
            message=f"Attachment with id '{attachment_id}' not found",
            details={"attachment_id": attachment_id},
        )


class UploadService:
    """Business logic for file uploads via S3 presigned URLs.

    Flow:
      1. Client requests a presigned PUT URL (validated here).
      2. Client uploads the file directly to S3.
      3. Client confirms the upload; we persist an attachment record.

    Downloads are served through short-lived presigned GET URLs so the bucket
    can remain private.
    """

    def __init__(self) -> None:
        self.repo = AttachmentRepo()
        self.ticket_repo = TicketRepo()

    @staticmethod
    def _validate_file(content_type: str, file_size: int) -> None:
        """Validate the file's content type and size.

        Raises:
            ValidationError: If the type is not allowed or the size exceeds the limit.
        """
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ValidationError(
                message=(
                    "Unsupported file type. Allowed types: "
                    "JPEG, PNG, GIF, WebP, MP4, WebM."
                ),
                details={"content_type": content_type},
            )
        if file_size <= 0 or file_size > MAX_FILE_SIZE:
            raise ValidationError(
                message="File exceeds the maximum size of 50MB.",
                details={"file_size": file_size, "max_file_size": MAX_FILE_SIZE},
            )

    async def _get_ticket_or_404(self, ticket_id: UUID) -> dict:
        ticket = await self.ticket_repo.get_by_id(ticket_id)
        if not ticket:
            raise TicketNotFoundError(ticket_id=str(ticket_id))
        return ticket

    async def generate_presigned_url(
        self, ticket_id: UUID, file_name: str, content_type: str, file_size: int
    ) -> dict:
        """Validate the request and generate a presigned upload URL.

        The S3 key is namespaced as ``{project_id}/{ticket_id}/{uuid}/{file_name}``
        so objects are grouped by project and ticket and never collide.

        Args:
            ticket_id: The ticket the file will be attached to.
            file_name: Original file name.
            content_type: MIME type of the file.
            file_size: Size in bytes.

        Returns:
            Dict with ``upload_url``, ``s3_key``, and ``expires_in``.
        """
        self._validate_file(content_type, file_size)
        ticket = await self._get_ticket_or_404(ticket_id)

        project_id = ticket.get("project_id")
        safe_name = file_name.strip().replace("/", "_").replace("\\", "_")
        s3_key = f"{project_id}/{ticket_id}/{uuid4()}/{safe_name}"

        expires_in = 900
        upload_url = await s3_client.generate_presigned_upload_url(
            key=s3_key, content_type=content_type, expires_in=expires_in
        )
        return {"upload_url": upload_url, "s3_key": s3_key, "expires_in": expires_in}

    async def confirm_upload(
        self,
        ticket_id: UUID,
        s3_key: str,
        file_name: str,
        content_type: str,
        file_size: int,
        user_id: UUID,
    ) -> dict:
        """Persist an attachment record after a successful S3 upload.

        Args:
            ticket_id: The parent ticket.
            s3_key: The S3 key the file was uploaded to.
            file_name: Original file name.
            content_type: MIME type.
            file_size: Size in bytes.
            user_id: The uploading user.

        Returns:
            The created attachment record, including a fresh download URL.
        """
        self._validate_file(content_type, file_size)
        await self._get_ticket_or_404(ticket_id)

        # Guard against a key that doesn't belong to this ticket.
        if not s3_key.split("/")[1:2] == [str(ticket_id)]:
            raise ValidationError(message="s3_key does not match the ticket.")

        record = await self.repo.create(
            {
                "ticket_id": str(ticket_id),
                "uploaded_by": str(user_id),
                "file_name": file_name,
                "s3_key": s3_key,
                "content_type": content_type,
                "file_size": file_size,
            }
        )
        logger.info(
            "attachment_created",
            extra={"resource": {"attachment_id": record.get("id"), "ticket_id": str(ticket_id)}},
        )

        record["download_url"] = await s3_client.generate_presigned_download_url(
            s3_key
        )
        return record

    async def list_attachments(self, ticket_id: UUID) -> list[dict]:
        """List a ticket's attachments, each with a fresh presigned download URL.

        Args:
            ticket_id: The parent ticket.

        Returns:
            List of attachment records with ``download_url`` populated.
        """
        attachments = await self.repo.list_by_ticket(ticket_id)
        for attachment in attachments:
            attachment["download_url"] = (
                await s3_client.generate_presigned_download_url(attachment["s3_key"])
            )
        return attachments

    async def delete_attachment(self, attachment_id: UUID, user: dict) -> None:
        """Delete an attachment from S3 and the database.

        Only the uploader or an admin may delete an attachment.

        Args:
            attachment_id: UUID of the attachment.
            user: The acting user record.

        Raises:
            AttachmentNotFoundError: If the attachment does not exist.
            ForbiddenError: If the user is neither the uploader nor an admin.
        """
        attachment = await self.repo.get_by_id(attachment_id)
        if not attachment:
            raise AttachmentNotFoundError(attachment_id=str(attachment_id))

        is_admin = user.get("role") == "admin"
        is_uploader = str(attachment.get("uploaded_by")) == str(user.get("id"))
        if not (is_admin or is_uploader):
            raise ForbiddenError(
                message="Only the uploader or an admin can delete this attachment."
            )

        await s3_client.delete_object(attachment["s3_key"])
        await self.repo.delete(attachment_id)
        logger.info(
            "attachment_deleted",
            extra={"resource": {"attachment_id": str(attachment_id)}},
        )
