# Dockerfile — the Fly Machine image for "BrowseCLI in a Fly Machine / Sprite".
#
# Fly auto-detects this Dockerfile and builds it remotely on `fly deploy`
# (or with a local Docker daemon via `fly deploy --local-only`). The built
# image is what runs inside every Fly Machine for this app.
#
# This image installs Node + the `browse` CLI. NO Chrome/Chromium is installed:
# the browser lives on Browserbase and is reached over CDP at run time. The Fly
# Machine runs your agent loop / the CLI; the Verified browser runs remotely
# (residential IP, stealth, server-side CAPTCHA solving).
FROM node:20-slim

# `browse` is the unified Browserbase CLI (browser automation + cloud APIs).
RUN npm install -g browse@latest \
    && browse --version

WORKDIR /app
COPY browsecli-demo.sh /app/browsecli-demo.sh
RUN chmod +x /app/browsecli-demo.sh

# Optionally override the protected site to visit.
ENV TARGET_URL=https://nowsecure.nl

# Default entrypoint for the one-shot "demo" process (see fly.toml [processes]).
# BROWSERBASE_API_KEY is injected as a Fly secret at
# run time (fly secrets set ...). This same CMD also runs the image as a plain
# `docker run` for the local Docker-equivalent smoke test.
CMD ["/app/browsecli-demo.sh"]
