"""Domain errors raised by services and turned into HTTP responses in main.py.

Services raise these instead of HTTPException so business logic does not depend
on the web framework and can be called directly from tests and the seed script.
"""


class NotFoundError(Exception):
    """The requested resource does not exist (HTTP 404)."""


class ConflictError(Exception):
    """The request conflicts with existing data, e.g. a duplicate email (HTTP 409)."""


class InvalidCursorError(Exception):
    """A pagination cursor could not be decoded (HTTP 422)."""
