from typing import Any, Dict, Optional
import urllib.request
import urllib.parse
import json

from .exceptions import (
    ShoutboardError, NotFoundError, UnauthorizedError,
    ValidationError, RateLimitError,
)


class HttpClient:
    def __init__(self, api_key: str, base_url: str = "https://api.shoutboard.io"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url}{path}"

        if params:
            filtered = {k: str(v) for k, v in params.items() if v is not None}
            url = f"{url}?{urllib.parse.urlencode(filtered)}"

        data = json.dumps(body).encode() if body is not None else None

        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
                "User-Agent": "shoutboard-python/0.1.0",
            },
        )

        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode())
                return result.get("data", result)
        except urllib.error.HTTPError as e:
            try:
                err_body = json.loads(e.read().decode())
            except Exception:
                err_body = {}

            message = (
                err_body.get("error", {}).get("message")
                or err_body.get("message")
                or f"Request failed with status {e.code}"
            )
            code = err_body.get("error", {}).get("code", "UNKNOWN_ERROR")

            if e.code == 400:
                raise ValidationError(e.code, code, message)
            elif e.code == 401:
                raise UnauthorizedError(e.code, code, message)
            elif e.code == 404:
                raise NotFoundError(e.code, code, message)
            elif e.code == 429:
                raise RateLimitError(e.code, code, message)
            else:
                raise ShoutboardError(e.code, code, message)

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        return self._request("GET", path, params=params)

    def post(self, path: str, body: Optional[Dict[str, Any]] = None) -> Any:
        return self._request("POST", path, body=body)

    def patch(self, path: str, body: Optional[Dict[str, Any]] = None) -> Any:
        return self._request("PATCH", path, body=body)

    def delete(self, path: str) -> Any:
        return self._request("DELETE", path)
