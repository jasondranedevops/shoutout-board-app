from .http import HttpClient
from .resources.boards import BoardsResource
from .resources.posts import PostsResource
from .resources.webhooks import WebhooksResource
from .resources.analytics import AnalyticsResource


class ShoutboardClient:
    """
    Main client for the Shoutboard API.

    Args:
        api_key: Your Shoutboard API key (find it in Dashboard → API Keys)
        base_url: Override the API base URL (default: https://api.shoutboard.io)

    Example::

        client = ShoutboardClient(api_key="sb_live_...")
        board = client.boards.create(
            title="Happy Birthday, Jane!",
            occasion_type="BIRTHDAY",
            recipient_name="Jane Smith",
        )
        client.boards.send(board["id"])
    """

    def __init__(self, api_key: str, base_url: str = "https://api.shoutboard.io"):
        http = HttpClient(api_key=api_key, base_url=base_url)
        self.boards = BoardsResource(http)
        self.posts = PostsResource(http)
        self.webhooks = WebhooksResource(http)
        self.analytics = AnalyticsResource(http)
