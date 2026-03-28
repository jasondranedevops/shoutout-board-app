from typing import Any, Dict


class AnalyticsResource:
    def __init__(self, http):
        self._http = http

    def get_org(self) -> Dict[str, Any]:
        """
        Get organization-level analytics.

        Returns totalBoards, totalPosts, totalContributors,
        boardsSentThisMonth, and avgPostsPerBoard.
        """
        return self._http.get("/v1/analytics")

    def get_board(self, board_id: str) -> Dict[str, Any]:
        """
        Get board-level analytics.

        Returns viewCount, postCount, uniqueContributors,
        anonymousContributions, and postsPerDay.
        """
        return self._http.get(f"/v1/analytics/boards/{board_id}")
