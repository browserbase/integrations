import { defineConfig } from "@trigger.dev/sdk/v3";
import { aptGet } from "@trigger.dev/build/extensions/core";
import { puppeteer } from "@trigger.dev/build/extensions/puppeteer";

export default defineConfig({
  project: "proj_ljbidlufugyxuhjxzkyy",
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [
      aptGet({ packages: ["mupdf-tools", "curl"] }),
      puppeteer(),
      // {
      //   name: "puppeteer-2",
      //   onBuildComplete: async (context) => {
      //     if (context.target === "dev") {
      //       return;
      //     }

      //     // context.logger.debug(`Adding ${this.name} to the build`);

      //     const instructions = [
      //       `RUN apt-get update && apt-get install curl gnupg -y \
      // && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
      // && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
      // && apt-get update \
      // && apt-get install google-chrome-stable -y --no-install-recommends \
      // && rm -rf /var/lib/apt/lists/*`,
      //     ];

      //     context.addLayer({
      //       id: "puppeteer",
      //       image: {
      //         instructions,
      //       },
      //       deploy: {
      //         env: {
      //           PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome-stable",
      //         },
      //         override: true,
      //       },
      //     });
      //   },
      // },
    ],
  },
});
