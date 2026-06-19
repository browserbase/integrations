# Container image for the Cloudflare Sandbox (Containers + @cloudflare/sandbox).
#
# A Cloudflare Worker cannot run the BrowseCLI directly — `browse` is a Node CLI
# that needs a real process, a filesystem, and outbound CDP sockets, none of
# which a plain Worker isolate provides. So the Worker hands the work to a
# Cloudflare *Container* (a Durable-Object-backed sandbox) built from this image.
#
# The container runs `npm i -g browse` and the demo script. It does NOT run a
# browser: Chrome lives on Browserbase and is reached over CDP at runtime, so the
# real web is browsed from a residential/verified IP with anti-bot + CAPTCHA
# solving — exactly what Cloudflare Browser Run does NOT offer.
#
# The base image MUST derive from cloudflare/sandbox: it runs the lightweight
# HTTP control server (port 3000) that @cloudflare/sandbox talks to for exec,
# file ops, and process management. A plain node:20-slim would NOT work here.
# Pin the image tag to the SDK version you install (see package.json). The base
# already ships Node 24 + Git + curl + jq. Images are linux/amd64 only.
FROM docker.io/cloudflare/sandbox:0.12.1

# `browse` is the unified Browserbase CLI (browser automation + cloud APIs).
# The base image already ships Node, so this just adds the global CLI.
RUN npm install -g browse@latest \
    && browse --version

WORKDIR /app
COPY browsecli-demo.sh /app/browsecli-demo.sh
RUN chmod +x /app/browsecli-demo.sh

# BROWSERBASE_API_KEY (and BROWSERBASE_PROJECT_ID) are injected at run time by
# the Worker via the sandbox `env` option. TARGET_URL optionally overrides the
# protected site to visit (default: a Cloudflare-protected page).
ENV TARGET_URL=https://nowsecure.nl

# The cloudflare/sandbox base image owns the entrypoint (the control server on
# port 3000 the Worker connects to). Do NOT override CMD/ENTRYPOINT — the Worker
# drives the `browse` CLI by calling sandbox.exec() on the running container, not
# via a baked CMD. Only EXPOSE ports YOUR app serves; the demo serves none.
