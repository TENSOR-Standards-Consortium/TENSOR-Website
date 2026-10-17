import contextlib
from datetime import datetime, timedelta, timezone
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "rotation", Path(__file__).resolve().parents[2] / "scripts/rotate-pages-token.py")
rotation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rotation)
TOKEN = "test-credential-value-must-stay-private-123456"
NOW = datetime(2026, 10, 17, tzinfo=timezone.utc)


def verification(**changes):
    return {"id": "a" * 32, "status": "active",
            "expires_on": (NOW + timedelta(days=30)).isoformat(), **changes}


PROJECT = {"name": rotation.PROJECT, "subdomain": rotation.PROJECT + ".pages.dev", "production_branch": "main"}


class PrivateHandoffTests(unittest.TestCase):
    def test_validates_account_owned_token_and_exact_project(self):
        with patch.object(rotation, "cf_result", side_effect=[verification(), PROJECT]) as cf:
            result = rotation.validate_token(TOKEN, NOW)
        self.assertEqual(result["tokenId"], "a" * 32)
        self.assertEqual(cf.call_args_list[0].args[0], f"accounts/{rotation.ACCOUNT}/tokens/verify")
        self.assertEqual(cf.call_args_list[1].args[0], f"accounts/{rotation.ACCOUNT}/pages/projects/{rotation.PROJECT}")
        self.assertNotIn(TOKEN, json.dumps(result))

    def test_inactive_unbounded_expired_future_and_long_lived_tokens_refused(self):
        cases = [verification(status="disabled"), verification(expires_on=""),
                 verification(expires_on=(NOW - timedelta(days=1)).isoformat()),
                 verification(expires_on=(NOW + timedelta(days=91)).isoformat()),
                 verification(not_before=(NOW + timedelta(hours=1)).isoformat())]
        for case in cases:
            with self.subTest(case=case), patch.object(rotation, "cf_result", return_value=case) as cf:
                with self.assertRaises(rotation.RotationError):
                    rotation.validate_token(TOKEN, NOW)
                self.assertEqual(cf.call_count, 1)

    def test_wrong_project_or_branch_refused(self):
        for wrong in [{**PROJECT, "name": "another-project"}, {**PROJECT, "production_branch": "dev"},
                      {**PROJECT, "subdomain": "another.pages.dev"}]:
            with self.subTest(project=wrong), patch.object(rotation, "cf_result", side_effect=[verification(), wrong]):
                with self.assertRaises(rotation.RotationError):
                    rotation.validate_token(TOKEN, NOW)

    def test_credential_never_in_process_args_env_or_printed_output(self):
        completed = subprocess.CompletedProcess([], 0, stdout=TOKEN.encode(), stderr=TOKEN.encode())
        output = io.StringIO()
        with patch.object(rotation.subprocess, "run", return_value=completed) as command, contextlib.redirect_stdout(output):
            rotation.gh(["secret", "set", rotation.SECRET], TOKEN.encode())
        self.assertEqual(command.call_args.kwargs["input"], TOKEN.encode())
        self.assertNotIn(TOKEN, repr(command.call_args.args))
        self.assertNotIn(TOKEN, repr(command.call_args.kwargs["env"]))
        self.assertNotIn("GH_DEBUG", command.call_args.kwargs["env"])
        self.assertNotIn(TOKEN, output.getvalue())

    def test_cli_errors_cannot_echo_credential(self):
        completed = subprocess.CompletedProcess([], 1, stdout=TOKEN.encode(), stderr=TOKEN.encode())
        with patch.object(rotation.subprocess, "run", return_value=completed):
            with self.assertRaises(rotation.RotationError) as error:
                rotation.gh(["secret", "set", rotation.SECRET], TOKEN.encode())
        self.assertNotIn(TOKEN, str(error.exception))

    def test_http_errors_cannot_echo_credential(self):
        with patch.object(rotation.urllib.request, "build_opener") as opener:
            opener.return_value.open.side_effect = RuntimeError(TOKEN)
            with self.assertRaises(rotation.RotationError) as error:
                rotation.request_bytes("https://api.cloudflare.com/client/v4/accounts/test", TOKEN)
        self.assertNotIn(TOKEN, str(error.exception))

    def test_redirects_and_unexpected_destinations_refused(self):
        with self.assertRaises(rotation.RotationError):
            rotation.NoRedirect().redirect_request(None, None, 302, "", {}, "https://elsewhere.example")
        for url in ["http://api.cloudflare.com/client/v4/", "https://api.cloudflare.com.evil/client/v4/", rotation.ORIGIN + "/"]:
            with self.subTest(url=url), self.assertRaises(rotation.RotationError):
                rotation.request_bytes(url, TOKEN)

    def test_piped_input_and_echo_fallback_refused(self):
        with patch.object(rotation.sys.stdin, "isatty", return_value=False):
            with self.assertRaises(rotation.RotationError):
                rotation.read_private_token()
        with patch.object(rotation.sys.stdin, "isatty", return_value=True), \
                patch.object(rotation.getpass, "getpass", side_effect=rotation.getpass.GetPassWarning()):
            with self.assertRaises(rotation.RotationError):
                rotation.read_private_token()

    def test_validation_failure_cannot_update_github(self):
        with patch.object(rotation, "api"), patch.object(rotation, "read_private_token", return_value=TOKEN), \
                patch.object(rotation, "validate_token", side_effect=rotation.RotationError("Rejected")), \
                patch.object(rotation, "save_receipt"), patch.object(rotation, "gh") as gh, \
                contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(rotation.RotationError):
                rotation.run()
        gh.assert_not_called()

    def test_failed_secret_transfer_cannot_dispatch_deployment(self):
        with patch.object(rotation, "api"), patch.object(rotation, "read_private_token", return_value=TOKEN), \
                patch.object(rotation, "validate_token", return_value={"tokenId": "a" * 32}), \
                patch.object(rotation, "save_receipt"), \
                patch.object(rotation, "gh", side_effect=rotation.RotationError("Transfer failed")) as gh, \
                contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(rotation.RotationError):
                rotation.run()
        self.assertEqual(gh.call_count, 1)
        self.assertEqual(gh.call_args.args[1], TOKEN.encode())

    def test_exact_dispatch_and_live_provenance_required(self):
        marker = "non-secret-test-check"
        active = {"id": 123, "head_sha": "b" * 40, "display_title": "Pages credential check " + marker,
                  "status": "in_progress"}
        done = {**active, "status": "completed", "conclusion": "success"}
        other = {**done, "id": 456, "display_title": "another deployment"}
        outputs = [{}, {"workflow_runs": [other, active]}, done, {"content": "e30="}]
        states = []
        with patch.object(rotation, "api", side_effect=outputs), \
                patch.object(rotation, "read_private_token", return_value=TOKEN), \
                patch.object(rotation, "validate_token", return_value={"tokenId": "a" * 32}), \
                patch.object(rotation, "save_receipt", side_effect=lambda state: states.append(dict(state))), \
                patch.object(rotation, "gh") as gh, patch.object(rotation.uuid, "uuid4", return_value=marker), \
                patch.object(rotation.time, "sleep"), patch.object(rotation, "request_bytes", return_value=b"{}"), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            rotation.run()
        self.assertEqual(states[-1]["runId"], 123)
        self.assertEqual(states[-1]["stage"], "replacement-proven-old-revocation-pending")
        self.assertFalse(states[-1]["oldCredentialRevoked"])
        self.assertNotIn(TOKEN, json.dumps(states))
        self.assertNotIn(TOKEN, output.getvalue())
        self.assertEqual(gh.call_count, 2)
        self.assertIn(rotation.ENVIRONMENT, gh.call_args_list[0].args[0])

    def test_failed_deployment_never_reports_replacement_proven(self):
        active = {"id": 123, "head_sha": "b" * 40, "display_title": "Pages credential check check", "status": "queued"}
        outputs = [{}, {"workflow_runs": [active]}, {**active, "status": "completed", "conclusion": "failure"}]
        states = []
        with patch.object(rotation, "api", side_effect=outputs), patch.object(rotation, "gh"), \
                patch.object(rotation, "read_private_token", return_value=TOKEN), \
                patch.object(rotation, "validate_token", return_value={}), \
                patch.object(rotation, "save_receipt", side_effect=lambda state: states.append(dict(state))), \
                patch.object(rotation.uuid, "uuid4", return_value="check"), patch.object(rotation.time, "sleep"), \
                contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(rotation.RotationError):
                rotation.run()
        self.assertNotEqual(states[-1]["stage"], "replacement-proven-old-revocation-pending")

    def test_stale_live_provenance_never_reports_replacement_proven(self):
        active = {"id": 123, "head_sha": "b" * 40, "display_title": "Pages credential check check", "status": "queued"}
        outputs = [{}, {"workflow_runs": [active]}, {**active, "status": "completed", "conclusion": "success"},
                   {"content": "e30="}]
        states = []
        with patch.object(rotation, "api", side_effect=outputs), patch.object(rotation, "gh"), \
                patch.object(rotation, "read_private_token", return_value=TOKEN), \
                patch.object(rotation, "validate_token", return_value={}), \
                patch.object(rotation, "save_receipt", side_effect=lambda state: states.append(dict(state))), \
                patch.object(rotation.uuid, "uuid4", return_value="check"), patch.object(rotation.time, "sleep"), \
                patch.object(rotation, "request_bytes", return_value=b"stale bytes"), \
                contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(rotation.RotationError):
                rotation.run()
        self.assertEqual(states[-1]["stage"], "deployment-passed-live-check-pending")

    def test_receipt_is_private_and_symlinks_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "status.json"
            with patch.object(rotation, "RECEIPT", path):
                rotation.save_receipt({"stage": "test"})
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
                path.unlink()
                path.symlink_to(Path(tmp) / "another")
                with self.assertRaises(OSError):
                    rotation.save_receipt({"stage": "test"})


if __name__ == "__main__":
    unittest.main()
