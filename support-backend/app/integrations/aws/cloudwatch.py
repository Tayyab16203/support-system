"""AWS CloudWatch Logs integration for audit logging.

Pushes structured JSON audit events to a CloudWatch Logs stream so the audit
trail is durable outside the application database and queryable via CloudWatch
Logs Insights.

The client is best-effort: any failure to reach CloudWatch is logged and
swallowed so it never blocks or fails the originating request. The audit_logs
table remains the source of truth; CloudWatch is a secondary, tamper-resistant
sink.
"""

import json
import threading
import time
from typing import Any, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CloudWatchClient:
    """AWS CloudWatch Logs client for pushing structured audit events.

    CloudWatch Logs requires a log group and a log stream to exist before
    events can be written. This client lazily ensures both exist on first use
    and caches the ``nextSequenceToken`` returned by ``put_log_events`` so
    subsequent writes succeed without a describe call each time.

    All public methods degrade gracefully: if AWS credentials are missing or a
    call fails, the error is logged and the method returns without raising.
    """

    def __init__(self) -> None:
        self.log_group = settings.cloudwatch_log_group
        self.log_stream = settings.cloudwatch_log_stream
        self.region = settings.aws_region
        self._client: Any = None
        self._sequence_token: Optional[str] = None
        self._initialized = False
        # put_log_events for a single stream must be serialized; guard the
        # sequence token so concurrent requests don't clobber it.
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        """Whether CloudWatch logging is configured (credentials present)."""
        return bool(settings.aws_access_key_id and settings.aws_secret_access_key)

    @property
    def client(self) -> Any:
        """Lazily create the boto3 CloudWatch Logs client."""
        if self._client is None:
            self._client = boto3.client(
                "logs",
                region_name=self.region,
                aws_access_key_id=settings.aws_access_key_id or None,
                aws_secret_access_key=settings.aws_secret_access_key or None,
            )
        return self._client

    def _ensure_stream(self) -> None:
        """Create the log group and stream if they don't already exist.

        Idempotent: ``ResourceAlreadyExistsException`` is treated as success.
        Also primes the cached sequence token from the existing stream so the
        first write doesn't collide with prior events.
        """
        if self._initialized:
            return

        client = self.client

        try:
            client.create_log_group(logGroupName=self.log_group)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") != "ResourceAlreadyExistsException":
                raise

        try:
            client.create_log_stream(
                logGroupName=self.log_group, logStreamName=self.log_stream
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") != "ResourceAlreadyExistsException":
                raise

        # Prime the sequence token from any existing stream state.
        try:
            described = client.describe_log_streams(
                logGroupName=self.log_group,
                logStreamNamePrefix=self.log_stream,
                limit=1,
            )
            streams = described.get("logStreams", [])
            if streams:
                self._sequence_token = streams[0].get("uploadSequenceToken")
        except ClientError:
            # A missing token just means the stream is empty; that's fine.
            self._sequence_token = None

        self._initialized = True

    def _put(self, event: dict[str, Any]) -> None:
        """Synchronously push one event, retrying once on a token mismatch.

        Runs under ``_lock`` so the sequence token stays consistent across
        concurrent callers.
        """
        message = json.dumps(event, default=str)
        log_event = {
            "timestamp": int(time.time() * 1000),
            "message": message,
        }

        for attempt in range(2):
            kwargs: dict[str, Any] = {
                "logGroupName": self.log_group,
                "logStreamName": self.log_stream,
                "logEvents": [log_event],
            }
            if self._sequence_token:
                kwargs["sequenceToken"] = self._sequence_token

            try:
                response = self.client.put_log_events(**kwargs)
                self._sequence_token = response.get("nextSequenceToken")
                return
            except ClientError as exc:
                code = exc.response.get("Error", {}).get("Code")
                # A stale/invalid token comes back with the correct expected
                # token in the message; recover it and retry once.
                if code in (
                    "InvalidSequenceTokenException",
                    "DataAlreadyAcceptedException",
                ) and attempt == 0:
                    expected = exc.response.get("expectedSequenceToken")
                    self._sequence_token = expected
                    continue
                raise

    async def put_log_event(self, event: dict[str, Any]) -> None:
        """Push a structured audit event to CloudWatch Logs (best-effort).

        Args:
            event: The structured audit event (JSON-serializable dict).
        """
        if not self.enabled:
            logger.debug(
                "cloudwatch_disabled_skip",
                extra={"event": event.get("action", "unknown")},
            )
            return

        try:
            with self._lock:
                self._ensure_stream()
                self._put(event)
        except (BotoCoreError, ClientError) as exc:
            # Never let an observability failure break the request path.
            logger.warning(
                "cloudwatch_put_failed",
                extra={"event": event.get("action", "unknown")},
                exc_info=exc,
            )


cloudwatch_client = CloudWatchClient()
