"""Application middleware for request processing."""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all incoming requests with timing information."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # Process the request
        response = await call_next(request)

        # Calculate processing time
        process_time_ms = (time.time() - start_time) * 1000

        # Log request details
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} ({process_time_ms:.1f}ms)",
            extra={
                "event": "http_request",
                "resource": f"{request.method} {request.url.path}",
            },
        )

        # Add timing header
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.1f}"
        return response
