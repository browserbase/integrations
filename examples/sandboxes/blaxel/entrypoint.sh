#!/bin/sh
#
# entrypoint.sh — dispatcher for the BrowseCLI Blaxel template.
#
# Two modes:
#
#   1. SANDBOX mode (default, no args) — boot the Blaxel `sandbox-api` on :8080,
#      so this behaves as a first-class Blaxel sandbox under `bl deploy`.
#      Blaxel's browser templates do the same (their entrypoint launches an
#      in-sandbox browser + sandbox-api). This template launches NO browser:
#      the `browse` CLI connects OUT to a Verified Browserbase browser.
#
#   2. DEMO / exec mode (any args) — exec the given command. This makes the
#      documented one-liner work as written:
#        docker run ... browsecli-sandbox:blaxel /app/browsecli-demo.sh
#      and mirrors how you'd run it in a live sandbox:
#        bl ... exec -- /app/browsecli-demo.sh
#
# The demo creates a Verified Browserbase session and opens a Cloudflare-
# protected page over CDP, asserting real content (not a challenge wall).

set -e

if [ "$#" -gt 0 ]; then
  # Friendly check so the demo fails loudly without creds instead of cryptically.
  case "$1" in
    */browsecli-demo.sh|browsecli-demo.sh)
      if [ -z "${BROWSERBASE_API_KEY:-}" ]; then
        echo "[entrypoint] BROWSERBASE_API_KEY is not set." >&2
        echo "[entrypoint] Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID (Blaxel secrets/env) and re-run." >&2
        exit 1
      fi
      ;;
  esac
  exec "$@"
fi

exec /usr/local/bin/sandbox-api
