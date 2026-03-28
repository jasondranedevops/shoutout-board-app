from typing import Any, Dict, List, Optional


class PostsResource:
    def __init__(self, http):
        self._http = http

    def list(self, board_id: str) -> List[Dict[str, Any]]:
        """List all posts on a board."""
        return self._http.get(f"/v1/boards/{board_id}/posts")

    def create(
        self,
        board_id: str,
        author_name: str,
        content_text: str,
        is_anonymous: bool = False,
        media_url: Optional[str] = None,
        gif_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Add a post to a board.

        Args:
            board_id: The board to post to
            author_name: Name of the contributor
            content_text: The message content
            is_anonymous: Post without revealing the author name
            media_url: Optional image/media attachment URL
            gif_url: Optional GIF URL
        """
        body: Dict[str, Any] = {
            "authorName": author_name,
            "contentText": content_text,
            "isAnonymous": is_anonymous,
        }
        if media_url:
            body["mediaUrl"] = media_url
        if gif_url:
            body["gifUrl"] = gif_url
        return self._http.post(f"/v1/boards/{board_id}/posts", body)

    def delete(self, post_id: str) -> None:
        """Delete a post."""
        self._http.delete(f"/v1/posts/{post_id}")
