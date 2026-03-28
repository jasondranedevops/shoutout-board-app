class ShoutboardError(Exception):
    """Base exception for all Shoutboard API errors."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message

    def __repr__(self):
        return f"ShoutboardError(status={self.status}, code={self.code!r}, message={self.message!r})"


class NotFoundError(ShoutboardError):
    """Raised when a resource is not found (404)."""


class UnauthorizedError(ShoutboardError):
    """Raised when the API key is missing or invalid (401)."""


class ValidationError(ShoutboardError):
    """Raised when request data fails validation (400)."""


class RateLimitError(ShoutboardError):
    """Raised when the rate limit is exceeded (429)."""
