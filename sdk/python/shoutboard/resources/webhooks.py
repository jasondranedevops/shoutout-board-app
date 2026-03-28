from typing import Any, Dict, List


class WebhooksResource:
    def __init__(self, http):
        self._http = http

    def list(self) -> List[Dict[str, Any]]:
        """List all webhook subscriptions."""
        return self._http.get("/v1/webhooks")

    def create(self, url: str, events: List[str], secret: str) -> Dict[str, Any]:
        """
        Create a webhook subscription.

        Args:
            url: The endpoint to deliver events to
            events: List of events to subscribe to, e.g. ['board.sent', 'post.created']
                    Use ['*'] to receive all events.
            secret: A secret string used to sign payloads (X-Shoutboard-Signature header)
        """
        return self._http.post("/v1/webhooks", {
            "url": url,
            "events": events,
            "secret": secret,
        })

    def delete(self, webhook_id: str) -> None:
        """Delete a webhook subscription."""
        self._http.delete(f"/v1/webhooks/{webhook_id}")

    def list_deliveries(self, webhook_id: str) -> List[Dict[str, Any]]:
        """List delivery attempts for a webhook."""
        return self._http.get(f"/v1/webhooks/{webhook_id}/deliveries")
