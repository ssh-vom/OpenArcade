import json
import os
import tempfile
import time
import unittest
import urllib.error
import urllib.request

from config_portal_service import ConfigPortalService


class ConfigPortalServiceTestCase(unittest.TestCase):
    def test_status_and_ping_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            static_dir = os.path.join(tmpdir, "dist")
            os.makedirs(static_dir, exist_ok=True)

            with open(os.path.join(static_dir, "index.html"), "w", encoding="utf-8") as handle:
                handle.write("<html><body>index</body></html>")
            with open(os.path.join(static_dir, "lite.html"), "w", encoding="utf-8") as handle:
                handle.write("<html><body>lite</body></html>")

            config_path = os.path.join(tmpdir, "config.json")
            service = ConfigPortalService(
                host="127.0.0.1",
                port=0,
                config_path=config_path,
                static_dir=static_dir,
                index_file="lite.html",
            )

            try:
                service.start()
                self._wait_until_running(service)

                port = service.bound_port
                self.assertIsNotNone(port)
                assert port is not None

                status_code, status_payload = self._request_json(
                    method="GET",
                    url=f"http://127.0.0.1:{port}/api/status",
                )
                self.assertEqual(status_code, 200)
                self.assertTrue(status_payload["ok"])
                self.assertEqual(status_payload["service"], "config_portal")
                self.assertEqual(status_payload["index_file"], "lite.html")

                ping_code, ping_payload = self._request_json(
                    method="POST",
                    url=f"http://127.0.0.1:{port}/api/command",
                    payload={"cmd": "ping"},
                )
                self.assertEqual(ping_code, 200)
                self.assertTrue(ping_payload["ok"])
                self.assertEqual(ping_payload["reply"], "pong")

                html = urllib.request.urlopen(  # nosec B310 - localhost in test
                    f"http://127.0.0.1:{port}/"
                ).read().decode("utf-8")
                self.assertIn("lite", html)
            finally:
                service.stop()

    def test_invalid_json_returns_bad_request(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            static_dir = os.path.join(tmpdir, "dist")
            os.makedirs(static_dir, exist_ok=True)
            with open(os.path.join(static_dir, "index.html"), "w", encoding="utf-8") as handle:
                handle.write("<html><body>index</body></html>")

            service = ConfigPortalService(
                host="127.0.0.1",
                port=0,
                static_dir=static_dir,
            )

            try:
                service.start()
                self._wait_until_running(service)
                port = service.bound_port
                assert port is not None

                request = urllib.request.Request(
                    f"http://127.0.0.1:{port}/api/command",
                    method="POST",
                    data=b"{not-json}",
                    headers={"Content-Type": "application/json"},
                )

                with self.assertRaises(urllib.error.HTTPError) as raised:
                    urllib.request.urlopen(request)  # nosec B310 - localhost in test

                self.assertEqual(raised.exception.code, 400)
                payload = json.loads(raised.exception.read().decode("utf-8"))
                raised.exception.close()
                self.assertFalse(payload["ok"])
                self.assertEqual(payload["error"], "invalid_json")
            finally:
                service.stop()

    def _wait_until_running(self, service: ConfigPortalService) -> None:
        for _ in range(60):
            if service.is_running and service.bound_port is not None:
                return
            time.sleep(0.05)
        self.fail("config portal service did not start")

    def _request_json(
        self,
        method: str,
        url: str,
        payload: dict | None = None,
    ) -> tuple[int, dict]:
        encoded = None
        headers = {}
        if payload is not None:
            encoded = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(
            url,
            method=method,
            data=encoded,
            headers=headers,
        )

        try:
            with urllib.request.urlopen(request) as response:  # nosec B310 - localhost in test
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            return exc.code, json.loads(body)


if __name__ == "__main__":
    unittest.main()
