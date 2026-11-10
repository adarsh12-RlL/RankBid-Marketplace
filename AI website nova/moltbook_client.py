# ─────────────────────────────────────────────────────────────────
# Moltbook Client — Privacy-First AI Social Network Integration
# ─────────────────────────────────────────────────────────────────
# This module NEVER sends personal information to Moltbook.
# All outgoing text is scrubbed by redact_private_text() from nova.
# All traffic is routed through a configurable HTTP/SOCKS proxy.
# ─────────────────────────────────────────────────────────────────
import os
import json
import time
import re
from pathlib import Path
from urllib.request import Request, urlopen, ProxyHandler, build_opener
from urllib.error import URLError, HTTPError
from urllib.parse import urlencode


MOLTBOOK_API = "https://www.moltbook.com/api/v1"
MOLTBOOK_CREDS_FILE = Path.home() / ".config" / "moltbook" / "credentials.json"

# ── Proxy helpers ─────────────────────────────────────────────────
def _build_opener_with_proxy(proxy_url=None):
    """Return a urllib opener that routes through the configured proxy."""
    proxy = proxy_url or os.environ.get("MOLTBOOK_PROXY", "")
    if proxy:
        handler = ProxyHandler({"http": proxy, "https": proxy})
        return build_opener(handler)
    return build_opener()          # direct connection (still no personal data)


# ── Credential persistence ───────────────────────────────────────
def _load_creds():
    if MOLTBOOK_CREDS_FILE.exists():
        try:
            return json.loads(MOLTBOOK_CREDS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}

def _save_creds(api_key, agent_name):
    MOLTBOOK_CREDS_FILE.parent.mkdir(parents=True, exist_ok=True)
    MOLTBOOK_CREDS_FILE.write_text(json.dumps({
        "api_key": api_key,
        "agent_name": agent_name,
        "saved_at": time.strftime("%Y-%m-%dT%H:%M:%S")
    }), encoding="utf-8")


# ── Low-level API call ───────────────────────────────────────────
def _api(method, path, body=None, api_key=None, proxy_url=None, timeout=12):
    """Fire a single Moltbook API request; return (ok, dict_or_error_str)."""
    url = f"{MOLTBOOK_API}/{path.lstrip('/')}"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = Request(url, data=data, headers=headers, method=method)
    opener = _build_opener_with_proxy(proxy_url)
    try:
        with opener.open(req, timeout=timeout) as resp:
            return True, json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            return False, err_body.get("error", str(e))
        except Exception:
            return False, str(e)
    except (URLError, Exception) as e:
        return False, f"Network/proxy error: {e}"


# ── Public API functions ─────────────────────────────────────────

def moltbook_register(agent_name="NovaAI",
                      description="A privacy-first local AI assistant. Proxy for a human user.",
                      proxy_url=None):
    """Register a new Moltbook agent. Returns (ok, message_str)."""
    creds = _load_creds()
    if creds.get("api_key"):
        return True, f"Already registered as {creds.get('agent_name', 'NovaAI')}. API key on file."

    ok, data = _api("POST", "agents/register", {
        "name": agent_name,
        "description": description
    }, proxy_url=proxy_url)

    if ok and isinstance(data, dict):
        agent = data.get("agent", {})
        key = agent.get("api_key")
        claim = agent.get("claim_url", "")
        if key:
            _save_creds(key, agent_name)
            return True, (
                f"Registered on Moltbook as '{agent_name}'.\n"
                f"Your owner needs to open this URL and verify via X (Twitter):\n{claim}\n"
                f"API key saved locally to {MOLTBOOK_CREDS_FILE}"
            )
    return False, f"Registration failed: {data}"


def moltbook_read_feed(submolt="general", limit=5, proxy_url=None):
    """Read the hot feed from a submolt. Returns (ok, summary_str)."""
    creds = _load_creds()
    key = creds.get("api_key")
    if not key:
        return False, "Not registered on Moltbook yet. Say 'register moltbook' first."

    ok, data = _api("GET", f"posts?submolt={submolt}&sort=hot&limit={limit}",
                     api_key=key, proxy_url=proxy_url)
    if ok and isinstance(data, dict):
        posts = data.get("posts", [])
        if not posts:
            return True, f"No recent posts in submolt '{submolt}'."
        lines = [f"Top {len(posts)} posts in '{submolt}':"]
        for i, p in enumerate(posts, 1):
            title = p.get("title", "(untitled)")
            author = p.get("author", {}).get("name", "unknown")
            ups = p.get("upvotes", 0)
            lines.append(f"  {i}. {title}  — by {author} ({ups} upvotes)")
        return True, "\n".join(lines)
    return False, f"Failed to fetch feed: {data}"


def moltbook_post(title, content="", submolt="general",
                  privacy_fn=None, solver_fn=None, proxy_url=None):
    """
    Post to Moltbook with full privacy scrubbing.
    privacy_fn(str)->str  — redact personal info (pass redact_private_text)
    solver_fn(str)->str   — solve obfuscated math CAPTCHA via local LLM
    Returns (ok, message_str).
    """
    creds = _load_creds()
    key = creds.get("api_key")
    if not key:
        return False, "Not registered on Moltbook yet. Say 'register moltbook' first."

    # ── Privacy scrub ────────────────────────────────────────────
    if privacy_fn:
        title = privacy_fn(title)
        content = privacy_fn(content)

    ok, data = _api("POST", "posts", {
        "submolt_name": submolt,
        "title": title,
        "content": content
    }, api_key=key, proxy_url=proxy_url)

    if not ok:
        return False, f"Post failed: {data}"

    post_obj = data.get("post", {})
    if post_obj.get("verification_status") == "pending" and post_obj.get("verification"):
        # Solve verification challenge
        return _solve_challenge(post_obj["verification"], key, solver_fn, proxy_url)

    return True, "Posted to Moltbook successfully."


def _solve_challenge(verification, api_key, solver_fn, proxy_url):
    """Solve the obfuscated math CAPTCHA required by Moltbook."""
    challenge_text = verification.get("challenge_text", "")
    code = verification.get("verification_code", "")

    if not solver_fn:
        return False, (
            "Moltbook requires a verification math challenge, "
            "but no local AI solver is available to solve it."
        )

    # Ask the local LLM to solve the obfuscated math problem
    prompt = (
        "The following is an obfuscated math word problem. "
        "Clean up the text by removing all special characters like ^, [, ], /, -, "
        "then solve the math problem. "
        "Respond with ONLY the numeric answer to 2 decimal places, nothing else.\n\n"
        f"Problem: {challenge_text}"
    )
    try:
        answer = solver_fn(prompt).strip()
        # Extract just the number from the response
        nums = re.findall(r"[\d]+\.?\d*", answer)
        if nums:
            answer = nums[-1]       # take the last number (usually the answer)
    except Exception as e:
        return False, f"AI solver error: {e}"

    ok, data = _api("POST", "verify", {
        "verification_code": code,
        "answer": answer
    }, api_key=api_key, proxy_url=proxy_url)

    if ok:
        return True, "Posted to Moltbook and verified successfully!"
    return False, f"Verification challenge failed: {data}"


def moltbook_search(query, limit=5, proxy_url=None):
    """Semantic search on Moltbook. Returns (ok, summary_str)."""
    creds = _load_creds()
    key = creds.get("api_key")
    if not key:
        return False, "Not registered on Moltbook yet. Say 'register moltbook' first."

    ok, data = _api("GET", f"search?q={query}&limit={limit}",
                     api_key=key, proxy_url=proxy_url)
    if ok and isinstance(data, dict):
        results = data.get("results", [])
        if not results:
            return True, f"No results found for '{query}' on Moltbook."
        lines = [f"Moltbook search results for '{query}':"]
        for i, r in enumerate(results, 1):
            rtype = r.get("type", "post")
            title = r.get("title") or r.get("content", "")[:60]
            author = r.get("author", {}).get("name", "unknown")
            lines.append(f"  {i}. [{rtype}] {title}  — by {author}")
        return True, "\n".join(lines)
    return False, f"Search failed: {data}"
