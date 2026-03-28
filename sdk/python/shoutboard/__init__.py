"""
Shoutboard Python SDK

Usage::

    from shoutboard import ShoutboardClient

    client = ShoutboardClient(api_key="sb_live_...")

    # List boards
    result = client.boards.list()
    for board in result["items"]:
        print(board["title"])

    # Create and send a board
    board = client.boards.create(
        title="Happy Birthday, Jane!",
        occasion_type="BIRTHDAY",
        recipient_name="Jane Smith",
        recipient_email="jane@example.com",
    )
    client.boards.send(board["id"])

    # Add a post
    client.posts.create(
        board_id=board["id"],
        author_name="Alice",
        content_text="Wishing you an amazing year! 🎂",
    )
"""

from .client import ShoutboardClient
from .exceptions import (
    ShoutboardError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
    RateLimitError,
)

__all__ = [
    "ShoutboardClient",
    "ShoutboardError",
    "NotFoundError",
    "UnauthorizedError",
    "ValidationError",
    "RateLimitError",
]

__version__ = "0.1.0"
