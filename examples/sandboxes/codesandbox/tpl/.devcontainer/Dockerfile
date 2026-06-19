# Golden-image base for the "BrowseCLI → Verified Browserbase" CodeSandbox template.
#
# CodeSandbox supports a custom OS image via .devcontainer/Dockerfile (the same
# mechanism the official `headless-chromium` template uses). Unlike that template
# we install NO browser: the browser lives on Browserbase and is reached over CDP
# at run time. We only need Node + the `browse` CLI.
FROM node:20-slim

RUN npm install -g browse@latest \
    && browse --version
