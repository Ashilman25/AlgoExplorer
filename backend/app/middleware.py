from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    UNCONDITIONAL_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "0",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    }

    def __init__(self, app, enforce_https: bool = False):
        super().__init__(app)
        self.enforce_https = enforce_https

    async def dispatch(self, request: Request, call_next):
        if self.enforce_https and request.url.scheme != "https":
            redirect_url = request.url.replace(scheme = "https")
            return RedirectResponse(url = str(redirect_url), status_code = 301)

        response = await call_next(request)

        for header, value in self.UNCONDITIONAL_HEADERS.items():
            response.headers[header] = value

        if self.enforce_https:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

        return response
