"""AWS S3 integration for file uploads."""

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class S3Client:
    """AWS S3 client for presigned URL generation and file operations.

    TODO: Step 6 - Implement with boto3.
    """

    def __init__(self) -> None:
        self.bucket = settings.s3_bucket_name
        self.region = settings.aws_region

    async def generate_presigned_upload_url(
        self, key: str, content_type: str, expires_in: int = 900
    ) -> str:
        """Generate a presigned PUT URL for direct client upload."""
        return ""

    async def generate_presigned_download_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a presigned GET URL for file download."""
        return ""

    async def delete_object(self, key: str) -> None:
        """Delete an object from S3."""
        pass
