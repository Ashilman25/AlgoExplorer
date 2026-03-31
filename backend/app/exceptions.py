class DomainError(Exception):
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details


class AuthenticationError(Exception):
    def __init__(self, message: str = "Authentication required.", details: dict = None):
        self.message = message
        self.details = details


class NotFoundException(Exception):
    def __init__(self, message: str):
        self.message = message


class ConflictError(Exception):
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details


class PermissionError(Exception):
    def __init__(self, message: str):
        self.message = message


class RateLimitError(Exception):
    def __init__(self, message: str = "Too many requests.", details: dict = None):
        self.message = message
        self.details = details
