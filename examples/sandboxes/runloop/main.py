#!/usr/bin/env python3
"""Reach any website from a Runloop devbox via a Verified Browserbase browser.

A Runloop *devbox* is great at running your **agent loop** — but a vanilla
Firecracker devbox can't browse the real web reliably. It has a **datacenter IP**
(instantly blocked by Cloudflare / Akamai / DataDome), no anti-bot fingerprint
hardening, and no way to solve a CAPTCHA. The usual fix — bundling Playwright +
Chromium into the image — still browses *from the datacenter IP*, so the hard
sites stay blocked.

This example keeps the browser **out** of the devbox. The devbox runs the
`browse` (Browserbase) CLI, which connects out over CDP to a **Verified
Browserbase browser** that:

  - uses a residential / verified IP  -> no datacenter-IP blocking
  - runs in Verified browser mode     -> passes bot-detection fingerprinting
  - auto-solves CAPTCHAs / challenges  -> server-side, no solver in the devbox

    +-------------------------+      CDP over wss       +--------------------------+
    |  Runloop devbox          |  ---------------------->  |  Browserbase Verified    |
    |  node + `browse` CLI     |                           |  browser (residential IP,|
    |  your agent loop         | <------------------------ |  stealth, CAPTCHA solve)  |
    +-------------------------+      page data / refs     +--------------------------+

Usage:
    python main.py create-blueprint          # build the reusable devbox image once
    python main.py run [--target-url URL]    # create a devbox + run the demo

Env (in .env or your shell):
    RUNLOOP_API_KEY         from platform.runloop.ai  (provisions devboxes)
    BROWSERBASE_API_KEY     from browserbase.com       (the Verified browser)
"""

from __future__ import annotations

import argparse
import os
import pathlib
import sys

from runloop_api_client import Runloop

BLUEPRINT_NAME = "browsecli-browserbase"
HERE = pathlib.Path(__file__).parent
DEMO_SCRIPT = (HERE / "browsecli-demo.sh").read_text()
BLUEPRINT_DOCKERFILE = (HERE / "blueprint.Dockerfile").read_text()


def _client() -> Runloop:
    token = os.environ.get("RUNLOOP_API_KEY")
    if not token:
        sys.exit("RUNLOOP_API_KEY is not set (get one at platform.runloop.ai)")
    return Runloop(bearer_token=token)


def create_blueprint() -> str:
    """Build (or reuse) the Blueprint: node + `browse` CLI, no Chrome.

    A Blueprint is a Docker-layer-cached devbox image. We bake the demo script
    into it via `file_mounts` so the Dockerfile's COPY succeeds during build.
    """
    client = _client()
    print(f"[runloop] building blueprint '{BLUEPRINT_NAME}' (node + browse CLI)...")
    blueprint = client.blueprints.create_and_await_build_complete(
        name=BLUEPRINT_NAME,
        dockerfile=BLUEPRINT_DOCKERFILE,
        file_mounts={"/app/browsecli-demo.sh": DEMO_SCRIPT},
    )
    print(f"[runloop] blueprint ready: {blueprint.id}")
    return blueprint.id


def run(target_url: str) -> int:
    """Create a devbox from the blueprint and run the Browserbase demo inside it."""
    client = _client()

    bb_key = os.environ.get("BROWSERBASE_API_KEY")
    if not bb_key:
        sys.exit("BROWSERBASE_API_KEY is not set (get one at browserbase.com)")

    env = {
        "BROWSERBASE_API_KEY": bb_key,
        "TARGET_URL": target_url,
    }

    print(f"[runloop] creating devbox from blueprint '{BLUEPRINT_NAME}'...")
    devbox = client.devboxes.create_and_await_running(
        blueprint_name=BLUEPRINT_NAME,
        environment_variables=env,
        name="browsecli-browserbase-demo",
    )
    print(f"[runloop] devbox running: {devbox.id}")

    try:
        print(f"[runloop] reaching protected target via Browserbase: {target_url}")
        result = client.devboxes.execute_sync(
            devbox.id,
            command="bash /app/browsecli-demo.sh",
        )
        # DevboxExecutionDetailView: .stdout, .stderr, .exit_status
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return result.exit_status or 0
    finally:
        print(f"[runloop] shutting down devbox {devbox.id}")
        client.devboxes.shutdown(devbox.id)


def main() -> None:
    parser = argparse.ArgumentParser(description="BrowseCLI in a Runloop devbox")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("create-blueprint", help="build the reusable devbox image")
    run_p = sub.add_parser("run", help="create a devbox and run the demo")
    run_p.add_argument("--target-url", default="https://nowsecure.nl")

    args = parser.parse_args()
    if args.cmd == "create-blueprint":
        create_blueprint()
    elif args.cmd == "run":
        code = run(args.target_url)
        if code != 0:
            raise SystemExit(code)
        print("[runloop] done")


if __name__ == "__main__":
    main()
