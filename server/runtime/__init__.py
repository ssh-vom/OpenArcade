__all__ = ["RuntimeApplication"]


def __getattr__(name: str):
    if name == "RuntimeApplication":
        from .app import RuntimeApplication

        return RuntimeApplication
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
