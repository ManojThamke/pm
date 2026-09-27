"""Health and greeting application services."""


def health_status() -> dict[str, str]:
    """Return the service health payload."""
    return {"status": "ok"}


def greeting() -> dict[str, str]:
    """Return the minimal API greeting."""
    return {"message": "Hello from the project management backend"}
