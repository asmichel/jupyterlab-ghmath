"""Python package metadata for the jupyterlab-ghmath prebuilt extension."""

# __version__ mirrors the Python package version in pyproject.toml.
__version__ = "0.1.0"


def _jupyter_labextension_paths() -> list[dict[str, str]]:
    """Return the labextension source and destination used by Jupyter discovery."""
    return [{"src": "labextension", "dest": "jupyterlab-ghmath"}]

