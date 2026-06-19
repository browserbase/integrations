# BrowseCLI in a Northflank service/job.
#
# Northflank builds this Dockerfile (kaniko/buildkit) and runs it as a microVM
# service or one-off Job. No Chrome/Chromium is installed: the browser lives on
# Browserbase and is reached over CDP at runtime, so the Northflank workload
# stays a tiny node + CLI image while the heavy Verified browser runs remotely.
FROM node:20-slim

# `browse` is the unified Browserbase CLI (browser automation + cloud APIs).
RUN npm install -g browse@latest \
    && browse --version

WORKDIR /app
COPY browsecli-demo.sh /app/browsecli-demo.sh
RUN chmod +x /app/browsecli-demo.sh

# BROWSERBASE_API_KEY are injected at run time by
# Northflank's runtime environment / secret group.
# TARGET_URL optionally overrides the protected site to visit.
ENV TARGET_URL=https://nowsecure.nl

CMD ["/app/browsecli-demo.sh"]
