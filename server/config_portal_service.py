from __future__ import annotations

import argparse
import json
import logging
import os
import signal
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from config_command_service import handle_command
from device_config_store import DeviceConfigStore
from runtime_ipc import notify_runtime_config_updated


logger = logging.getLogger("OpenArcade")

OPENARCADE_CONFIG_PORTAL_HOST_ENV_VAR = "OPENARCADE_CONFIG_PORTAL_HOST"
OPENARCADE_CONFIG_PORTAL_PORT_ENV_VAR = "OPENARCADE_CONFIG_PORTAL_PORT"
OPENARCADE_CONFIG_PORTAL_STATIC_DIR_ENV_VAR = "OPENARCADE_CONFIG_PORTAL_STATIC_DIR"
OPENARCADE_CONFIG_PORTAL_INDEX_FILE_ENV_VAR = "OPENARCADE_CONFIG_PORTAL_INDEX_FILE"

DEFAULT_CONFIG_PORTAL_HOST = "0.0.0.0"
DEFAULT_CONFIG_PORTAL_PORT = 8080
DEFAULT_CONFIG_PORTAL_STATIC_DIR = "/opt/openarcade/app/config_app/dist"
DEFAULT_CONFIG_PORTAL_INDEX_FILE = "index.html"
MAX_COMMAND_BYTES = 64 * 1024


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def resolve_portal_host() -> str:
    return os.environ.get(
        OPENARCADE_CONFIG_PORTAL_HOST_ENV_VAR,
        DEFAULT_CONFIG_PORTAL_HOST,
    )


def resolve_portal_port() -> int:
    raw = os.environ.get(OPENARCADE_CONFIG_PORTAL_PORT_ENV_VAR)
    if not raw:
        return DEFAULT_CONFIG_PORTAL_PORT

    try:
        port = int(raw)
        if port < 1 or port > 65535:
            raise ValueError("out of range")
        return port
    except ValueError:
        logger.warning(
            "Invalid %s='%s', using default port %s",
            OPENARCADE_CONFIG_PORTAL_PORT_ENV_VAR,
            raw,
            DEFAULT_CONFIG_PORTAL_PORT,
        )
        return DEFAULT_CONFIG_PORTAL_PORT


def resolve_portal_static_dir() -> str:
    from_env = os.environ.get(OPENARCADE_CONFIG_PORTAL_STATIC_DIR_ENV_VAR)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_fallback = os.path.abspath(os.path.join(script_dir, "..", "config_app", "dist"))

    for candidate in (from_env, DEFAULT_CONFIG_PORTAL_STATIC_DIR, repo_fallback):
        if candidate and os.path.isdir(candidate):
            return candidate

    # Keep deterministic behavior even if the directory doesn't exist yet.
    return from_env or DEFAULT_CONFIG_PORTAL_STATIC_DIR


def resolve_portal_index_file() -> str:
    raw = (os.environ.get(OPENARCADE_CONFIG_PORTAL_INDEX_FILE_ENV_VAR) or "").strip()
    if not raw:
        return DEFAULT_CONFIG_PORTAL_INDEX_FILE

    candidate = raw.lstrip("/")
    if not candidate.endswith(".html") or ".." in candidate:
        logger.warning(
            "Invalid %s='%s', using default '%s'",
            OPENARCADE_CONFIG_PORTAL_INDEX_FILE_ENV_VAR,
            raw,
            DEFAULT_CONFIG_PORTAL_INDEX_FILE,
        )
        return DEFAULT_CONFIG_PORTAL_INDEX_FILE

    return candidate


class ConfigPortalRequestHandler(SimpleHTTPRequestHandler):
    store: DeviceConfigStore
    command_lock: threading.RLock
    static_dir: str
    index_file: str

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=self.static_dir, **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        logger.info("config-portal %s - %s", self.address_string(), format % args)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/command":
            self._send_json({"ok": False, "error": "not_found"}, status=HTTPStatus.NOT_FOUND)
            return

        content_length_header = self.headers.get("Content-Length", "")
        try:
            content_length = int(content_length_header)
        except ValueError:
            self._send_json(
                {"ok": False, "error": "invalid_content_length"},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        if content_length <= 0:
            self._send_json(
                {"ok": False, "error": "missing_body"},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        if content_length > MAX_COMMAND_BYTES:
            self._send_json(
                {"ok": False, "error": "payload_too_large"},
                status=HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
            )
            return

        try:
            raw_payload = self.rfile.read(content_length)
            message = json.loads(raw_payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(
                {"ok": False, "error": "invalid_json"},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        if not isinstance(message, dict):
            self._send_json(
                {"ok": False, "error": "invalid_payload"},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        with self.command_lock:
            self.store.load()
            response, should_notify_runtime = handle_command(self.store, message)

        if should_notify_runtime:
            runtime_notified = notify_runtime_config_updated()
            if not runtime_notified:
                logger.warning(
                    "Runtime update notification failed for command: %s",
                    message.get("cmd"),
                )

        self._send_json(response)

    def do_GET(self) -> None:
        path = urlparse(self.path).path

        if path == "/api/status":
            self._send_json(
                {
                    "ok": True,
                    "service": "config_portal",
                    "static_dir": self.static_dir,
                    "index_file": self.index_file,
                }
            )
            return

        if path.startswith("/api/"):
            self._send_json({"ok": False, "error": "not_found"}, status=HTTPStatus.NOT_FOUND)
            return

        if path in ("", "/"):
            self.path = f"/{self._resolve_entry_file()}"
            super().do_GET()
            return

        candidate = self._resolve_static_candidate(path)
        if candidate and os.path.isfile(candidate):
            super().do_GET()
            return

        # SPA fallback.
        self.path = f"/{self._resolve_entry_file()}"
        super().do_GET()

    def _resolve_entry_file(self) -> str:
        preferred = self.index_file or DEFAULT_CONFIG_PORTAL_INDEX_FILE
        preferred_candidate = self._resolve_static_candidate(f"/{preferred}")
        if preferred_candidate and os.path.isfile(preferred_candidate):
            return preferred

        fallback_candidate = self._resolve_static_candidate(f"/{DEFAULT_CONFIG_PORTAL_INDEX_FILE}")
        if fallback_candidate and os.path.isfile(fallback_candidate):
            return DEFAULT_CONFIG_PORTAL_INDEX_FILE

        return preferred

    def _resolve_static_candidate(self, request_path: str) -> str | None:
        normalized = os.path.normpath(request_path.lstrip("/"))
        static_root = os.path.abspath(self.static_dir)
        candidate = os.path.abspath(os.path.join(static_root, normalized))

        if candidate == static_root or candidate.startswith(f"{static_root}{os.sep}"):
            return candidate
        return None

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


class ConfigPortalService:
    def __init__(
        self,
        host: str,
        port: int,
        config_path: str | None = None,
        static_dir: str | None = None,
        index_file: str | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.config_path = config_path
        self.static_dir = static_dir or resolve_portal_static_dir()
        self.index_file = index_file or resolve_portal_index_file()

        self._lock = threading.RLock()
        self._server: ReusableThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    @property
    def is_running(self) -> bool:
        with self._lock:
            return self._thread is not None and self._thread.is_alive()

    @property
    def bound_port(self) -> int | None:
        with self._lock:
            if self._server is None:
                return None
            return int(self._server.server_address[1])

    def start(self) -> None:
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return

            store = DeviceConfigStore(path=self.config_path)
            store.load()

            handler = type("OpenArcadeConfigPortalHandler", (ConfigPortalRequestHandler,), {})
            handler.store = store
            handler.command_lock = threading.RLock()
            handler.static_dir = self.static_dir
            handler.index_file = self.index_file

            server = ReusableThreadingHTTPServer((self.host, self.port), handler)
            thread = threading.Thread(
                target=self._serve,
                args=(server,),
                daemon=True,
                name="config-portal",
            )

            self._server = server
            self._thread = thread
            thread.start()

    def _serve(self, server: ReusableThreadingHTTPServer) -> None:
        try:
            logger.info(
                "Config portal listening on http://%s:%s (static_dir=%s index_file=%s)",
                server.server_address[0],
                server.server_address[1],
                self.static_dir,
                self.index_file,
            )
            server.serve_forever(poll_interval=0.5)
        except Exception:
            logger.exception("Config portal server loop crashed")
        finally:
            server.server_close()
            with self._lock:
                if self._server is server:
                    self._server = None
                if self._thread is threading.current_thread():
                    self._thread = None
            logger.info("Config portal stopped")

    def stop(self, timeout: float = 5.0) -> None:
        with self._lock:
            server = self._server
            thread = self._thread

        if server is None:
            return

        logger.info("Shutting down config portal")
        server.shutdown()

        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=timeout)


def run(
    host: str,
    port: int,
    config_path: str | None = None,
    static_dir: str | None = None,
    index_file: str | None = None,
) -> int:
    service = ConfigPortalService(
        host=host,
        port=port,
        config_path=config_path,
        static_dir=static_dir,
        index_file=index_file,
    )

    stop_once = threading.Event()

    def trigger_shutdown(reason: str) -> None:
        if stop_once.is_set():
            return
        stop_once.set()
        logger.info("Shutting down config portal (%s)", reason)
        service.stop()

    def on_signal(signum: int, _frame: Any) -> None:
        trigger_shutdown(f"signal {signum}")

    previous_sigterm = signal.getsignal(signal.SIGTERM)
    previous_sigint = signal.getsignal(signal.SIGINT)

    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)

    try:
        service.start()

        while not stop_once.is_set() and service.is_running:
            stop_once.wait(0.5)

        if not stop_once.is_set() and not service.is_running:
            logger.error("Config portal stopped unexpectedly")
            return 1

        return 0
    finally:
        signal.signal(signal.SIGTERM, previous_sigterm)
        signal.signal(signal.SIGINT, previous_sigint)
        service.stop()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="OpenArcade local HTTP configuration portal service"
    )
    parser.add_argument(
        "--host",
        default=resolve_portal_host(),
        help="Host interface to bind",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=resolve_portal_port(),
        help="Port to bind",
    )
    parser.add_argument(
        "--config",
        help="Path to persistent config store JSON file",
    )
    parser.add_argument(
        "--static-dir",
        default=resolve_portal_static_dir(),
        help="Directory containing built config frontend assets",
    )
    parser.add_argument(
        "--index-file",
        default=resolve_portal_index_file(),
        help="Primary SPA entry file (default: index.html)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    return run(
        host=args.host,
        port=args.port,
        config_path=args.config,
        static_dir=args.static_dir,
        index_file=args.index_file,
    )


if __name__ == "__main__":
    raise SystemExit(main())
