# ---
# cmd: ["modal", "run", "browsecli_in_modal.py"]
# ---

# # Reach any website from a Modal Function with a Verified Browserbase browser
#
# Modal is great at running your **agent loop** — but a Firecracker sandbox can't
# browse the real web reliably. It has a **datacenter IP** (instantly blocked by
# Cloudflare/Akamai/DataDome), no anti-bot fingerprint hardening, and no way to
# solve a CAPTCHA. The usual fix — bundling Playwright + Chromium into the image —
# still browses *from the datacenter IP*, so the hard sites stay blocked.
#
# This example keeps the browser **out** of the sandbox. The Modal Function runs
# the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
# CLI, which connects out over CDP to a **Verified Browserbase browser** that:
#
# - uses a **residential / verified IP** — no datacenter-IP blocking
# - runs in **Verified browser mode** — passes bot-detection fingerprinting
# - **auto-solves CAPTCHAs / challenges** server-side
#
# ```
# ┌─────────────────────────┐      CDP over wss       ┌──────────────────────────┐
# │  Modal Function          │  ───────────────────────▶ │  Browserbase Verified    │
# │  node + `browse` CLI     │                            │  browser (residential IP,│
# │  your agent loop         │ ◀──────────────────────────│  stealth, CAPTCHA solve)  │
# └─────────────────────────┘      page data / refs     └──────────────────────────┘
# ```
#
# To run it:
#
# ```bash
# export BROWSERBASE_API_KEY=bb_live_...   # plus BROWSERBASE_PROJECT_ID=...
# modal run browsecli_in_modal.py
# ```
#
# (Or store them once as a named Modal Secret — `modal secret create browserbase
# BROWSERBASE_API_KEY=... BROWSERBASE_PROJECT_ID=...` — and swap the
# `Secret.from_dict(...)` below for `modal.Secret.from_name("browserbase")`.)

import os
import subprocess

import modal

# ## Build the image
#
# Modal's `debian_slim` has no Node, so we start from the official `node:20-slim`
# image, add a Python interpreter (so Modal can run its agent inside), install the
# `browse` CLI globally, and copy in the demo script. **No Chrome/Chromium is
# installed** — the browser lives on Browserbase and is reached over CDP at run time.

image = (
    modal.Image.from_registry("node:20-slim", add_python="3.12")
    .run_commands("npm install -g browse@latest", "browse --version")
    .add_local_file("browsecli-demo.sh", "/app/browsecli-demo.sh", copy=True)
)

app = modal.App("browsecli-in-modal", image=image)

# ## The Function
#
# The Function shells out to the same `browse` commands as `browsecli-demo.sh`:
# create a Verified session (`--proxies --verified --solve-captchas`), open a
# Cloudflare-protected page over CDP, and assert we reached real content instead
# of a challenge wall.
#
# We inject Browserbase creds with `Secret.from_dict`, reading them from the
# **local** environment at launch — so no pre-created Modal Secret is required.
#
# **CI guard.** Modal runs every gallery example live on each push, where no
# Browserbase key exists. In that case `from_dict` injects an empty string, and
# the guard below prints a clear "skipping" message and returns cleanly (exit 0)
# instead of failing CI. With a key present, the live run is cheap — one short
# Verified session.

browserbase_secret = modal.Secret.from_dict(
    {
        "BROWSERBASE_API_KEY": os.environ.get("BROWSERBASE_API_KEY", ""),
        "BROWSERBASE_PROJECT_ID": os.environ.get("BROWSERBASE_PROJECT_ID", ""),
    }
)


@app.function(secrets=[browserbase_secret])
def reach_protected_site(target_url: str = "https://nowsecure.nl") -> int:
    if not os.environ.get("BROWSERBASE_API_KEY"):
        print(
            "[browsecli-in-modal] skipping live run (no BROWSERBASE_API_KEY). "
            "Set it in your env before `modal run`, e.g. export BROWSERBASE_API_KEY=..."
        )
        return 0

    # Run the same demo the other sandbox templates run. We invoke the committed
    # shell script so the behavior is identical across every provider example.
    result = subprocess.run(
        ["bash", "/app/browsecli-demo.sh"],
        env={**os.environ, "TARGET_URL": target_url},
    )
    return result.returncode


# ## Local entrypoint
#
# `modal run browsecli_in_modal.py` triggers this, which runs the Function in the
# cloud. Pass a different site with `--target-url`.


@app.local_entrypoint()
def main(target_url: str = "https://nowsecure.nl"):
    code = reach_protected_site.remote(target_url)
    if code == 0:
        print("[browsecli-in-modal] done")
    else:
        raise SystemExit(code)
