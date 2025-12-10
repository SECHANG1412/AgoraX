from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from fastapi.responses import PlainTextResponse


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Double Submit Token pattern:
    - Client sends X-CSRF-Token header matching csrf_token cookie for unsafe methods.
    - Safe methods (GET/HEAD/OPTIONS) are skipped.
    """

    def __init__(self, app):
        super().__init__(app)
        self._unsafe_methods = {"POST", "PUT", "PATCH", "DELETE"}
        # Endpoints that must stay open (e.g., login/signup/token refresh)
        self._exempt_paths = {
            "/users/login",
            "/users/signup",
            "/users/refresh",
        }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        if request.method in self._unsafe_methods:
            if request.url.path in self._exempt_paths:
                return await call_next(request)

            header_token = request.headers.get("X-CSRF-Token")
            cookie_token = request.cookies.get("csrf_token")
            if not header_token or not cookie_token or header_token != cookie_token:
                return PlainTextResponse("CSRF validation failed", status_code=403)

        return await call_next(request)
