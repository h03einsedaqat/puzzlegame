#!/usr/bin/env python3
"""Serve the repository and open preview-v2 directly at the preview root."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import os

ROOT = Path(__file__).resolve().parent.parent


class PreviewHandler(SimpleHTTPRequestHandler):
    def _redirect_root(self) -> bool:
        if urlsplit(self.path).path != "/":
            return False
        self.send_response(302)
        self.send_header("Location", "/preview-v2/")
        self.end_headers()
        return True

    def do_GET(self) -> None:
        if not self._redirect_root():
            super().do_GET()

    def do_HEAD(self) -> None:
        if not self._redirect_root():
            super().do_HEAD()


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("0.0.0.0", 4173), PreviewHandler)
    print("Serving preview-v2 at http://0.0.0.0:4173/", flush=True)
    server.serve_forever()
