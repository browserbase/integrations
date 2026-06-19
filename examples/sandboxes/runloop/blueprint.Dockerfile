# Runloop Blueprint — "BrowseCLI in a Runloop devbox".
#
# A Runloop *Blueprint* is a reusable, Docker-layer-cached devbox image. Once
# built, every devbox created from it boots in seconds with these layers warm.
#
# This blueprint bakes in Node + the `browse` CLI (and Python, so the devbox can
# also run an agent loop). NO Chrome/Chromium is installed: the browser lives on
# Browserbase and is reached over CDP at run time — that is the whole point.
#
# Build it once via the runner (`python main.py create-blueprint` /
# `npm run create-blueprint`), then create devboxes from it on demand.
FROM node:20-slim

# Python so the devbox can host a Python agent alongside the CLI.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# `browse` is the unified Browserbase CLI (browser automation + cloud APIs).
RUN npm install -g browse@latest \
    && browse --version

WORKDIR /app
COPY browsecli-demo.sh /app/browsecli-demo.sh
RUN chmod +x /app/browsecli-demo.sh

# BROWSERBASE_API_KEY (and BROWSERBASE_PROJECT_ID) are injected when the devbox
# is created (see main.py / index.ts). TARGET_URL optionally overrides the site.
ENV TARGET_URL=https://nowsecure.nl

CMD ["/app/browsecli-demo.sh"]
