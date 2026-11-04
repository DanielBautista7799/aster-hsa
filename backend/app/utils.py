def format_cents(amount_cents: int) -> str:
    """Format integer cents as dollars for messages, e.g. 123456 -> '$1,234.56'.

    Uses integer division only, never floats.
    """
    dollars, cents = divmod(amount_cents, 100)
    return f"${dollars:,}.{cents:02d}"
