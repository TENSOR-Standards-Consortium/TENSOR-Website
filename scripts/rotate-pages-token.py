#!/usr/bin/env python3
"""Private local handoff for the existing TENSOR Pages deployment credential.

Only the human enters the token, through a non-echoing terminal prompt. Never
accept it in arguments, environment variables, files, chat or browser automation.
The token goes only to Cloudflare over HTTPS and gh secret set over stdin.
"""

import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import uuid
import warnings
from datetime import datetime, timedelta, timezone

ACCOUNT = "07163d912c7affd851cd295e78bc72b1"
PROJECT = "tensor-standards"
REPO = "TENSOR-Standards-Consortium/TENSOR-Website"
ENVIRONMENT = "tensor-production"
SECRET = "TENSOR_CLOUDFLARE_API_TOKEN"
WORKFLOW = "cloudflare-pages.yml"
ORIGIN = "https://tensor-standards.pages.dev"
PROVENANCE = "public/core/0.1.0-draft.1/provenance.json"
RECEIPT = Path.home() / "Library/Logs/TENSOR/pages-token-rotation.json"


class RotationError(Exception):
    """Only static, credential-free messages may be raised to the user."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RotationError("Redirect refused. No credential was forwarded.")


def request_bytes(url, token=None):
    # Fixed destinations; do not inherit a proxy or forward Authorization.
    if not (url.startswith("https://api.cloudflare.com/client/v4/") or
            (token is None and url.startswith(ORIGIN + "/"))):
        raise RotationError("Unexpected request destination refused.")
    headers = {"User-Agent": "TENSOR-private-credential-handoff/1", "Accept": "application/json"}
    if token is not None:
        headers["Authorization"] = "Bearer " + token
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        with opener.open(urllib.request.Request(url, headers=headers), timeout=30) as response:
            value = response.read(16 * 1024 * 1024 + 1)
            if len(value) > 16 * 1024 * 1024:
                raise RotationError("Provider response exceeded the safety limit.")
            return value
    except RotationError:
        raise
    except Exception:
        # Never propagate a provider body, headers, or exception containing secrets.
        raise RotationError("Provider request failed. GitHub may be unchanged; see the status receipt.") from None


def cf_result(path, token):
    try:
        data = json.loads(request_bytes("https://api.cloudflare.com/client/v4/" + path, token))
        if data.get("success") is not True or not isinstance(data.get("result"), dict):
            raise ValueError()
        return data["result"]
    except RotationError:
        raise
    except Exception:
        raise RotationError("Cloudflare did not return a valid successful response.") from None


def timestamp(value):
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError()
        return parsed.astimezone(timezone.utc)
    except Exception:
        raise RotationError("Token must have a valid, bounded expiration date.") from None


def validate_token(token, now=None):
    now = now or datetime.now(timezone.utc)
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,256}", token):
        raise RotationError("Token format was not accepted. Nothing was updated.")
    result = cf_result(f"accounts/{ACCOUNT}/tokens/verify", token)
    if result.get("status") != "active" or not re.fullmatch(r"[a-f0-9]{32}", result.get("id", "")):
        raise RotationError("Token is not active. Nothing was updated.")
    expires = timestamp(result.get("expires_on", ""))
    if not now + timedelta(hours=1) < expires <= now + timedelta(days=90):
        raise RotationError("Choose an expiry more than one hour and no more than 90 days away. Nothing was updated.")
    if result.get("not_before") and timestamp(result["not_before"]) > now:
        raise RotationError("Token is not usable yet. Nothing was updated.")
    project = cf_result(f"accounts/{ACCOUNT}/pages/projects/{PROJECT}", token)
    if (project.get("name"), project.get("subdomain"), project.get("production_branch")) != (
            PROJECT, PROJECT + ".pages.dev", "main"):
        raise RotationError("Token did not reach the expected TENSOR production project. Nothing was updated.")
    # Pages-only credentials cannot inspect token policies. The human must check
    # the creation summary; project access alone does not prove least privilege.
    return {"tokenId": result["id"], "expiresOn": expires.isoformat()}


def gh(args, secret_input=None):
    executable = shutil.which("gh") or "/opt/homebrew/bin/gh"
    env = {k: v for k, v in os.environ.items() if k not in {"GH_DEBUG", "GH_LOG_FILE"}}
    env.update({"GH_HOST": "github.com", "GH_PROMPT_DISABLED": "1"})
    try:
        result = subprocess.run([executable, *args], input=secret_input,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                env=env, timeout=60, check=False)
    except Exception:
        raise RotationError("GitHub CLI could not complete the operation. Check the status receipt before retrying.") from None
    if result.returncode:
        # Raw stdout/stderr are never displayed, including secret-transfer errors.
        raise RotationError("GitHub operation failed. Check sign-in and the status receipt; do not revoke the old token.")
    if secret_input is not None:
        return None
    try:
        return json.loads(result.stdout)
    except Exception:
        raise RotationError("GitHub returned an unexpected response.") from None


def api(path, *extra, secret_input=None):
    return gh(["api", "--hostname", "github.com", f"repos/{REPO}/{path}", *extra], secret_input)


def save_receipt(state):
    # Status only. The secret value is never placed in this dictionary or file.
    RECEIPT.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(RECEIPT, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w") as out:
        os.fchmod(out.fileno(), 0o600)
        json.dump(state, out, indent=2)
        out.write("\n")


def read_private_token():
    if not sys.stdin.isatty():
        raise RotationError("Open this helper in a local Terminal. Piped credential input is refused.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        try:
            return getpass.getpass("Paste the replacement token here (hidden), then press Return: ").strip()
        except (getpass.GetPassWarning, EOFError):
            raise RotationError("A private, non-echoing prompt was not available. Nothing was updated.") from None


def run():
    print("TENSOR Pages credential rotation — local private handoff\n")
    print("Create an ACCOUNT-owned token in TENSOR Standards Consortium:")
    print("  Cloudflare Pages: Edit only; dedicated TENSOR account only.")
    print("  Expiration: within 90 days. No DNS, Workers, billing or token management.")
    print("Check Cloudflare's permission summary before copying. Access tests cannot detect extra permissions.")
    print("Do not paste the token into chat. The helper never saves or prints its value.\n")
    api("environments/" + ENVIRONMENT)  # Fail before requesting the secret if gh is not ready.
    token = read_private_token()
    state = {"startedAt": datetime.now(timezone.utc).isoformat(), "stage": "validating",
             "oldCredentialRevoked": False}
    save_receipt(state)
    try:
        metadata = validate_token(token)
        state.update(metadata, stage="validated-before-secret-update")
        save_receipt(state)
        print("Cloudflare accepted the token and confirmed the TENSOR production project.")
        state["stage"] = "secret-update-started-outcome-unconfirmed"
        save_receipt(state)
        gh(["secret", "set", SECRET, "--env", ENVIRONMENT, "--repo", "github.com/" + REPO], token.encode())
        token = None
        state["stage"] = "github-secret-updated"
        save_receipt(state)
        print("GitHub environment secret updated using local encryption. Starting the deployment check…")
        marker = str(uuid.uuid4())
        state["checkId"] = marker
        save_receipt(state)
        # This non-secret marker identifies this dispatch, rather than an unrelated green run.
        gh(["workflow", "run", WORKFLOW, "--ref", "main", "--repo", "github.com/" + REPO,
            "--json"], json.dumps({"rotation_check": marker}).encode())
        deadline = time.monotonic() + 20 * 60
        run = None
        while time.monotonic() < deadline:
            if run is None:
                runs = api(f"actions/workflows/{WORKFLOW}/runs?event=workflow_dispatch&branch=main&per_page=30")
                matches = [item for item in runs["workflow_runs"]
                           if item.get("display_title") == "Pages credential check " + marker]
                if len(matches) > 1:
                    raise RotationError("More than one matching deployment was found. Inspect Actions before proceeding.")
                if matches:
                    run = matches[0]
                    if not isinstance(run.get("id"), int) or not re.fullmatch(r"[a-f0-9]{40}", run.get("head_sha", "")):
                        raise RotationError("Deployment identity was not accepted.")
                    state.update(runId=run["id"], websiteCommit=run["head_sha"], stage="deployment-running")
                    save_receipt(state)
                    print(f"Watching deployment {run['id']} (this may take several minutes)…")
            else:
                run = api(f"actions/runs/{run['id']}")
                if run.get("status") == "completed":
                    break
            time.sleep(10)
        if not run or run.get("status") != "completed" or run.get("conclusion") != "success":
            raise RotationError("Deployment did not pass within the waiting window. Do not revoke the old token; inspect Actions.")
        state["stage"] = "deployment-passed-live-check-pending"
        save_receipt(state)
        content = api(f"contents/{PROVENANCE}?ref={state['websiteCommit']}")
        expected = base64.b64decode(content["content"], validate=False)
        for attempt in range(12):
            served = request_bytes(ORIGIN + "/" + PROVENANCE.removeprefix("public/"))
            if hashlib.sha256(served).digest() == hashlib.sha256(expected).digest():
                break
            if attempt == 11:
                raise RotationError("Deployment passed but live provenance did not match yet. Do not revoke the old token.")
            time.sleep(10)
        state.update(stage="replacement-proven-old-revocation-pending",
                     finishedAt=datetime.now(timezone.utc).isoformat())
        save_receipt(state)
        print("\nReplacement proven: deployment passed and live source provenance matches.")
        print("Now revoke ONLY the old temporary proof token in Cloudflare (expires October 18, 2026).")
        print("Keep the new token. Never paste either token value into chat.")
        print("Status receipt (no secret): " + str(RECEIPT))
        print(f"Deployment: https://github.com/{REPO}/actions/runs/{run['id']}")
    finally:
        token = None  # No promise of secure memory erasure; no deliberate persistence.


def main():
    if len(sys.argv) != 1:
        print("No arguments are accepted. Enter the credential only at the private Terminal prompt.")
        return 1
    try:
        run()
        return 0
    except KeyboardInterrupt:
        print("\nStopped. Check the status receipt before retrying. Do not revoke the old credential.")
    except RotationError as error:
        print("\n" + str(error))
    except Exception:
        print("\nOperation stopped. Check the status receipt and Actions; do not revoke the old credential.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
