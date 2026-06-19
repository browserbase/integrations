# Canonical base image for "BrowseCLI in a sandbox" templates.
#
# This is the EXACT image that runs inside a Docker/OCI-based sandbox
# (E2B, Modal, Daytona, Cloudflare Containers, CodeSandbox, Fly, ...).
# It installs Node + the `browse` CLI. No Chrome/Chromium is installed:
# the browser lives on Browserbase and is reached over CDP at runtime.
FROM node:20-slim

# `browse` is the unified Browserbase CLI (browser automation + cloud APIs).
RUN npm install -g browse@latest \
    && browse --version

WORKDIR /app
COPY browsecli-demo.sh /app/browsecli-demo.sh
RUN chmod +x /app/browsecli-demo.sh

# BROWSERBASE_API_KEY (and BROWSERBASE_PROJECT_ID) are injected at run time.
# TARGET_URL optionally overrides the protected site to visit.
ENV TARGET_URL=https://nowsecure.nl

CMD ["/app/browsecli-demo.sh"]
