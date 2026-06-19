# hub/browsecli — BrowseCLI inside a Blaxel sandbox.
#
# This MIRRORS the Blaxel hub template format (it layers the Blaxel `sandbox-api`
# binary and exposes the sandbox API on 8080, exactly like hub/node-slim,
# hub/chromium, etc.) but INVERTS the browser model:
#
#   - Blaxel's hub/chromium and hub/playwright-chromium run a headless browser
#     *inside* the sandbox and expose it over CDP on a second port.
#   - This template runs NO browser in the sandbox. Instead it ships Node + the
#     unified Browserbase `browse` CLI, which connects OUT over CDP to a
#     *Verified Browserbase browser* (residential IP, stealth fingerprint,
#     server-side CAPTCHA solving) — things an in-sandbox Chromium can't do.
#
# Result: a Blaxel sandbox that can reach anti-bot / CAPTCHA-walled sites the
# stock browser templates get blocked on.

ARG SANDBOX_VERSION=latest
FROM ghcr.io/blaxel-ai/sandbox:${SANDBOX_VERSION} AS sandbox-api

# Debian slim (glibc), same base family as hub/node-slim, with Node 20.
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  bash \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Layer in the Blaxel sandbox API so this image runs as a first-class sandbox.
COPY --from=sandbox-api /sandbox-api /usr/local/bin/sandbox-api

# `browse` is the unified Browserbase CLI (browser automation + cloud APIs).
# No Chrome/Chromium is installed: the browser lives on Browserbase, reached
# over CDP at runtime.
RUN npm install -g browse@latest \
    && browse --version

WORKDIR /blaxel
ENV HOME=/blaxel

# The load-bearing demo: create a Verified Browserbase session and reach a
# Cloudflare-protected page over CDP, asserting real content (not a challenge).
# Installed at both /usr/local/bin (on PATH) and /app (the path used in docs
# and the docker-equivalent test).
COPY browsecli-demo.sh /usr/local/bin/browsecli-demo.sh
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /usr/local/bin/browsecli-demo.sh /app/entrypoint.sh \
    && cp /usr/local/bin/browsecli-demo.sh /app/browsecli-demo.sh \
    && chmod +x /app/browsecli-demo.sh

# BROWSERBASE_API_KEY (and BROWSERBASE_PROJECT_ID) are injected at run time
# (Blaxel secrets / env). TARGET_URL optionally overrides the protected site.
ENV TARGET_URL=https://nowsecure.nl

# Port 8080 is the Blaxel sandbox API (same as every other hub template).
EXPOSE 8080

# Dispatcher entrypoint:
#   - no args  -> boots the Blaxel sandbox-api on :8080 (normal `bl deploy`)
#   - any args -> exec them, so `docker run ... /app/browsecli-demo.sh` runs the
#                 demo, and `bl ... exec -- /app/browsecli-demo.sh` works too.
ENTRYPOINT ["/app/entrypoint.sh"]
