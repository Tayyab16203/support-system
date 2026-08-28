"""AWS S3 integration for file uploads via presigned URLs."""

from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings
from app.core.exceptions import IntegrationError
from app.core.logging import get_logger

logger = get_logger(__name__)


class S3Client:
    """AWS S3 client for presigned URL generation and object operations.

    Uploads happen directly from the browser to S3 using presigned PUT URLs,
    so large files never pass through the API server. Downloads use short-lived
    presigned GET URLs so the bucket can stay private.
    """

    def __init__(self) -> None:
        self.bucket = settings.s3_bucket_name
        self.region = settings.aws_region
        self._client: Any = None

    @property
    def client(self) -> Any:
        """Lazily create the boto3 S3 client (Signature V4 for presigned URLs)."""
        if self._client is None:
            self._client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=settings.aws_access_key_id or None,
                aws_secret_access_key=settings.aws_secret_access_key or None,
                # Pin to the regional endpoint (virtual-host style) so presigned
                # URLs target s3.<region>.amazonaws.com directly. Without this,
                # buckets outside us-east-1 return a 307 redirect that browsers
                # cannot replay for a signed PUT.
                endpoint_url=f"https://s3.{self.region}.amazonaws.com",
                config=Config(
                    signature_version="s3v4",
                    s3={"addressing_style": "virtual"},
                ),
            )
        return self._client

    async def generate_presigned_upload_url(
        self, key: str, content_type: str, expires_in: int = 900
    ) -> str:
        """Generate a presigned PUT URL for direct client upload.

        Args:
            key: The S3 object key to upload to.
            content_type: The MIME type the client will send.
            expires_in: URL lifetime in seconds (default 15 minutes).

        Returns:
            A presigned URL the client can PUT the file to.

        Raises:
            IntegrationError: If the URL could not be generated.
        """
        try:
            return self.client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error("s3_presigned_upload_failed", exc_info=exc)
            raise IntegrationError(
                message="Could not generate upload URL."
            ) from exc

    async def generate_presigned_download_url(
        self, key: str, expires_in: int = 3600
    ) -> str:
        """Generate a presigned GET URL for file download.

        Args:
            key: The S3 object key.
            expires_in: URL lifetime in seconds (default 1 hour).

        Returns:
            A presigned URL for downloading the object.

        Raises:
            IntegrationError: If the URL could not be generated.
        """
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error("s3_presigned_download_failed", exc_info=exc)
            raise IntegrationError(
                message="Could not generate download URL."
            ) from exc

    async def delete_object(self, key: str) -> None:
        """Delete an object from S3.

        Args:
            key: The S3 object key to delete.

        Raises:
            IntegrationError: If the delete call fails.
        """
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except (BotoCoreError, ClientError) as exc:
            logger.error("s3_delete_failed", exc_info=exc)
            raise IntegrationError(message="Could not delete file.") from exc


s3_client = S3Client()
