# Browserbase Managed Agent + Box AI Compliance Intake

This example turns the Browserbase + Box compliance demo into a reusable
Browserbase managed Agent. Browserbase owns the browser loop and file gathering;
the local application retrieves the Agent session's downloads, uploads them to
Box, and runs the same Box AI Q&A, structured extraction, metadata, and compliance
steps as the Stagehand example.

## Flow

1. `src/agent.ts` creates a reusable Browserbase Agent with instructions to
   gather real browser downloads.
2. `src/index.ts` starts a run with the configured source pages and link names.
3. The application polls the run until it reaches a terminal state.
4. The run's `sessionId` is passed to the Browserbase Downloads API.
5. The downloaded SDS and label are uploaded to Box.
6. Box AI answers questions, extracts structured metadata, and returns source
   references and confidence scores.
7. The deterministic compliance check and Agent/run/session IDs are stored in
   Box metadata.

## Setup

```bash
cd examples/integrations/box-managed-agent
pnpm install --ignore-workspace
cp .env.example .env
# Fill in BROWSERBASE_API_KEY and the Box credentials.
```

Create the reusable managed Agent once:

```bash
pnpm create-agent
```

Copy the printed ID into `.env` as `BROWSERBASE_AGENT_ID`, then run the workflow:

```bash
pnpm start
```

Each run prints the Agent status and Session Inspector URL, the Browserbase
download list, Box AI results, the compliance decision, and links to the uploaded
Box files.

## Environment variables

| Variable               | Required | Description                                        |
| ---------------------- | -------- | -------------------------------------------------- |
| `BROWSERBASE_API_KEY`  | Yes      | Browserbase API key                                |
| `BROWSERBASE_AGENT_ID` | Yes      | ID printed by `pnpm create-agent`                  |
| `BOX_CLIENT_ID`        | Yes      | Box Server App client ID                           |
| `BOX_CLIENT_SECRET`    | Yes      | Box Server App client secret                       |
| `BOX_ENTERPRISE_ID`    | Yes      | Enterprise that owns the app's service account     |
| `BOX_FOLDER_ID`        | Yes      | Destination folder shared with the service account |
| `SDS_PAGE_URL`         | No       | Page containing the safety data sheet download     |
| `SDS_LINK_TEXT`        | No       | Safety data sheet download link name               |
| `LABEL_PAGE_URL`       | No       | Page containing the product label download         |
| `LABEL_LINK_TEXT`      | No       | Product label download link name                   |

## Documentation

- [Browserbase Agents overview](https://docs.browserbase.com/platform/agents/overview)
- [Integrating Agents](https://docs.browserbase.com/platform/agents/integrate-api-sdk)
- [Managing Agent files](https://docs.browserbase.com/platform/agents/managing-files)
- [Browserbase Downloads API](https://docs.browserbase.com/platform/browser/files/downloads)
- [Box AI structured extraction](https://developer.box.com/reference/post-ai-extract-structured)
