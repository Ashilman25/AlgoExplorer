class DomainError(Exception):
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details


class NotFoundException(Exception):
    def __init__(self, message: str):
        self.message = message


class PermissionError(Exception):
    def __init__(self, message: str):
        self.message = message
