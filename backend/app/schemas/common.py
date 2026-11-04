"""Small reusable field types and the base class for request schemas."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


def cents_field(maximum: int, description: str):
    """A positive whole number of cents, capped at `maximum`.

    strict=True means JSON must contain a real integer: 5000 is accepted,
    while 50.5, 5000.0, "5000" and true are all rejected with a 422. This keeps
    floating-point values out of every money calculation.
    """
    return Annotated[int, Field(strict=True, gt=0, le=maximum, description=description)]


# Control characters (including NUL, which PostgreSQL text cannot store).
NO_CONTROL_CHARACTERS = r"^[^\x00-\x1f\x7f]*$"


def trimmed_text(min_length: int, max_length: int):
    """A trimmed, length-limited string with no control characters."""
    return Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=min_length,
            max_length=max_length,
            pattern=NO_CONTROL_CHARACTERS,
        ),
    ]


class RequestModel(BaseModel):
    """Base for request bodies: unknown fields are an error, not silently ignored
    (a typo like "amount" instead of "amount_cents" should fail loudly)."""

    model_config = ConfigDict(extra="forbid")
