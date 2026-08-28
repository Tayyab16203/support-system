"""Structured logging configuration for CloudWatch integration."""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

from app.config import settings


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging (CloudWatch compatible)."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "support-system",
            "environment": settings.app_env,
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Add extra fields if present
        if hasattr(record, "event"):
            log_entry["event"] = record.event  # type: ignore[attr-defined]
        if hasattr(record, "actor"):
            log_entry["actor"] = record.actor  # type: ignore[attr-defined]
        if hasattr(record, "resource"):
            log_entry["resource"] = record.resource  # type: ignore[attr-defined]
        if hasattr(record, "project"):
            log_entry["project"] = record.project  # type: ignore[attr-defined]

        # Add exception info if present
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = {
                "type": type(record.exc_info[1]).__name__,
                "message": str(record.exc_info[1]),
            }

        return json.dumps(log_entry)


def setup_logging() -> None:
    """Configure structured logging for the application."""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO if settings.is_production else logging.DEBUG)

    # Remove default handlers
    root_logger.handlers.clear()

    # Console handler with structured output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(console_handler)

    # Quiet noisy third-party libraries (only surface warnings+ from them)
    for noisy in (
        "botocore",
        "boto3",
        "urllib3",
        "httpx",
        "httpcore",
        "hpack",
        "s3transfer",
        "asyncio",
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger instance.

    Args:
        name: Logger name (typically __name__ of the module).

    Returns:
        Configured logger instance.
    """
    return logging.getLogger(name)


# Initialize logging on import
setup_logging()

# Application logger
logger = get_logger("support-system")
