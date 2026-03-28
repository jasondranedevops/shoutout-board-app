from typing import Any, Dict, List, Optional
from datetime import datetime


class BoardsResource:
    def __init__(self, http):
        self._http = http

    def list(
        self,
        status: Optional[str] = None,
        occasion_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        List boards for the organization.

        Returns a dict with 'items' (list of boards) and 'pagination'.
        """
        result = self._http.get("/v1/boards", params={
            "status": status,
            "occasionType": occasion_type,
            "limit": limit,
            "offset": offset,
        })
        return {
            "items": result.get("boards", []),
            "pagination": result.get("pagination", {}),
        }

    def get(self, board_id: str) -> Dict[str, Any]:
        """Get a board by ID, including its posts."""
        return self._http.get(f"/v1/boards/{board_id}")

    def create(
        self,
        title: str,
        occasion_type: str,
        recipient_name: str,
        recipient_email: Optional[str] = None,
        cover_theme: str = "indigo",
        scheduled_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new board.

        Args:
            title: Board title, e.g. "Happy Birthday, Jane!"
            occasion_type: One of BIRTHDAY, ANNIVERSARY, FAREWELL, PROMOTION, WELCOME, CUSTOM
            recipient_name: Full name of the recipient
            recipient_email: Optional email to send the board to
            cover_theme: Color theme — indigo, violet, rose, emerald, blue, or orange
            scheduled_at: ISO 8601 datetime string for scheduled delivery
        """
        body: Dict[str, Any] = {
            "title": title,
            "occasionType": occasion_type,
            "recipientName": recipient_name,
            "coverTheme": cover_theme,
        }
        if recipient_email:
            body["recipientEmail"] = recipient_email
        if scheduled_at:
            body["scheduledAt"] = scheduled_at
        return self._http.post("/v1/boards", body)

    def update(self, board_id: str, **kwargs) -> Dict[str, Any]:
        """
        Update a board. Accepts title, recipient_name, cover_theme, scheduled_at.
        """
        field_map = {
            "title": "title",
            "recipient_name": "recipientName",
            "cover_theme": "coverTheme",
            "scheduled_at": "scheduledAt",
        }
        body = {field_map[k]: v for k, v in kwargs.items() if k in field_map}
        return self._http.patch(f"/v1/boards/{board_id}", body)

    def delete(self, board_id: str) -> None:
        """Delete a board."""
        self._http.delete(f"/v1/boards/{board_id}")

    def send(self, board_id: str) -> Dict[str, Any]:
        """Mark a board as sent and deliver it to the recipient."""
        return self._http.post(f"/v1/boards/{board_id}/send")

    def schedule(self, board_id: str, scheduled_at: str) -> Dict[str, Any]:
        """
        Schedule a board for future delivery.

        Args:
            board_id: The board ID
            scheduled_at: ISO 8601 datetime string, e.g. "2025-06-01T09:00:00Z"
        """
        return self._http.post(f"/v1/boards/{board_id}/schedule", {"scheduledAt": scheduled_at})

    def activate(self, board_id: str) -> Dict[str, Any]:
        """Activate a board so the share link is live for contributions."""
        return self._http.post(f"/v1/boards/{board_id}/activate")

    def get_public(self, slug: str) -> Dict[str, Any]:
        """Get a board's public view by slug (no auth required)."""
        return self._http.get(f"/v1/boards/{slug}/public")
