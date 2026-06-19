#!/usr/bin/env python3
"""
BrowseCLI inside a Morph Cloud instance.

This builds a reusable Morph *snapshot* that has Node + the `browse` CLI
pre-installed, boots an instance from it, and runs `browsecli-demo.sh` inside
that instance. The demo uses the `browse` CLI to drive a *remote* Verified
Browserbase browser over CDP — the browser never runs in the Morph instance.

Why pair Morph + Browserbase?
  Morph gives you a fast, snapshot-based microVM to run your agent loop.
  Browserbase gives that loop a browser that can actually reach the open web:
    - residential / verified IP (no datacenter-IP blocking)
    - Verified browser mode (passes bot-detection fingerprinting)
    - server-side CAPTCHA / challenge solving
  So `browse` runs *in* the Morph instance and connects *out* to Browserbase.

Idiomatic Morph shape used here (morphcloud SDK):
    from morphcloud.api import MorphCloudClient
    client   = MorphCloudClient()
    snapshot = client.snapshots.create(image_id=..., vcpus=..., memory=..., disk_size=...)
    snapshot = snapshot.setup("<shell command>")     # cached -> builds a template
    instance = client.instances.start(snapshot_id=snapshot.id)
    instance.wait_until_ready()
    result   = instance.exec(command="<shell command>")  # result.stdout / .stderr / .exit_code
    instance.stop()

Env required:
  MORPH_API_KEY          - your Morph Cloud API key
  BROWSERBASE_API_KEY    - your Browserbase API key (passed into the instance)
  BROWSERBASE_PROJECT_ID - your Browserbase project id (passed into the instance)
Optional:
  TARGET_URL             - protected site to visit (default https://nowsecure.nl)
"""

import os
import sys
from pathlib import Path

from morphcloud.api import MorphCloudClient

# --- config -----------------------------------------------------------------

BASE_IMAGE = "morphvm-minimal"
VCPUS = 1
MEMORY_MB = 1024
DISK_MB = 8192

DEMO_LOCAL = Path(__file__).with_name("browsecli-demo.sh")
DEMO_REMOTE = "/root/browsecli-demo.sh"


def require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"error: {name} must be set in the environment")
    return val


def main() -> int:
    require_env("MORPH_API_KEY")
    bb_key = require_env("BROWSERBASE_API_KEY")
    bb_project = require_env("BROWSERBASE_PROJECT_ID")
    target_url = os.environ.get("TARGET_URL", "https://nowsecure.nl")

    client = MorphCloudClient()  # reads MORPH_API_KEY from env

    # 1) Base snapshot. Snapshots are Morph's template primitive.
    print("[morph] creating base snapshot...")
    snapshot = client.snapshots.create(
        image_id=BASE_IMAGE,
        vcpus=VCPUS,
        memory=MEMORY_MB,
        disk_size=DISK_MB,
    )

    # 2) Bake Node + the `browse` CLI into the snapshot via setup steps.
    #    Each setup() returns a NEW snapshot that includes the change and is
    #    cached, so re-runs reuse the prebuilt template instead of rebuilding.
    print("[morph] installing Node.js + `browse` CLI into the snapshot...")
    snapshot = snapshot.setup(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - "
        "&& apt-get install -y nodejs"
    )
    snapshot = snapshot.setup("npm install -g browse@latest && browse --version")
    print(f"[morph] template snapshot ready: {snapshot.id}")

    # 3) Boot an instance from the template and run the demo inside it.
    #    The context manager stops the instance on exit.
    print("[morph] starting instance from template snapshot...")
    with client.instances.start(snapshot_id=snapshot.id) as instance:
        instance.wait_until_ready()
        print(f"[morph] instance ready: {instance.id}")

        # Upload the demo script. Morph instances expose SSH; the SDK's exec()
        # runs commands, and we write the script via a heredoc-free upload.
        script = DEMO_LOCAL.read_text()
        # Base64 the script so any quoting/newlines survive the shell hop.
        import base64

        b64 = base64.b64encode(script.encode()).decode()
        instance.exec(command=f"echo {b64} | base64 -d > {DEMO_REMOTE}")
        instance.exec(command=f"chmod +x {DEMO_REMOTE}")

        # Run the demo with Browserbase creds injected into the instance's env.
        print(f"[morph] running browsecli-demo.sh against {target_url} ...")
        env = (
            f"BROWSERBASE_API_KEY={bb_key} "
            f"BROWSERBASE_PROJECT_ID={bb_project} "
            f"TARGET_URL={target_url}"
        )
        result = instance.exec(command=f"{env} {DEMO_REMOTE}")

        print("----- instance stdout -----")
        print(result.stdout)
        if getattr(result, "stderr", ""):
            print("----- instance stderr -----")
            print(result.stderr)

        exit_code = getattr(result, "exit_code", 0)
        if exit_code != 0:
            print(f"[morph] demo exited non-zero ({exit_code})")
            return exit_code

    print("[morph] done — instance stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
