# Browserbase + Box AI Compliance Intake

This example uses Browserbase to download a safety data sheet and product-label
image from the web, uploads both files to Box, and turns them into an agentic
compliance workflow with Box AI.

The default sources are a Clorox safety data sheet and an EPA disinfectant-label
guide. They intentionally demonstrate how an agent can identify a packet that
needs human review. Override the source variables in `.env` to process a matching
SDS and label pair.

## What it demonstrates

1. Stagehand opens real manufacturer and government web pages in a Browserbase session.
2. The remote browser downloads a PDF and PNG to Browserbase cloud storage.
3. The Browserbase Downloads API returns the original file bytes.
4. The files are uploaded to Box.
5. `POST /ai/ask` answers safety questions about the SDS with citations.
6. `POST /ai/extract_structured` extracts structured metadata and automatically
   applies OCR to the label image.
7. A deterministic agent checks the extracted EPA registration numbers and SDS
   revision date.
8. The extraction and decision are saved on each Box file using the global
   `properties` metadata template.

## Prerequisites

- Node.js 18 or newer
- A Browserbase API key
- A Box Platform App with:
  - Read and write access to files and folders
  - Manage AI enabled
- A Box plan with access to the Box AI API

This demo uses one authentication method: a Box Developer Token. In the
[Box Developer Console](https://app.box.com/developers/console), select your app,
open **Configuration**, and click **Generate Developer Token**. Add the resulting
token to `.env` as `BOX_DEVELOPER_TOKEN`. Developer Tokens expire after 60 minutes,
so generate a fresh one when an existing token stops working.

## Run it

```bash
cd examples/integrations/box
pnpm install
cp .env.example .env
# Fill in Browserbase and Box credentials.
pnpm start
```

The command prints:

- A Browserbase Session Inspector URL
- The cited Box AI answer
- Extracted metadata, confidence scores, and source references
- The compliance decision
- Links to the uploaded Box files

## Configuration

| Variable              | Required | Description                                                         |
| --------------------- | -------- | ------------------------------------------------------------------- |
| `BROWSERBASE_API_KEY` | Yes      | Browserbase browser and Model Gateway API key                       |
| `BOX_DEVELOPER_TOKEN` | Yes      | Short-lived Box Developer Token                                     |
| `BOX_FOLDER_ID`       | No       | Destination folder; defaults to the authenticated user's root (`0`) |
| `SDS_PAGE_URL`        | No       | Web page containing the SDS link                                    |
| `SDS_LINK_TEXT`       | No       | Accessible name of the SDS download link                            |
| `LABEL_PAGE_URL`      | No       | Web page containing the label-image link                            |
| `LABEL_LINK_TEXT`     | No       | Accessible name of the label download link                          |

The source page and its file should share an origin so the demo can add the HTML
`download` attribute before clicking the link. This is what reliably sends PDFs
and images into Browserbase download storage instead of opening them in a tab.

## Why structured extraction

Box's freeform `POST /ai/extract` endpoint does not perform OCR. This example uses
`POST /ai/extract_structured`, which supports OCR for scanned PDFs and image files
such as TIFF, PNG, and JPEG. It also returns confidence scores and references that
an agent can use to decide when human review is required.

Box AI does not process a mixed text-and-image packet as one multimodal request.
The example therefore asks questions about the SDS, extracts each file separately,
and compares the structured results in application code.

## Useful documentation

- [Browserbase downloads](https://docs.browserbase.com/platform/browser/files/downloads)
- [Stagehand](https://docs.stagehand.dev/v3/first-steps/quickstart)
- [Box file uploads](https://developer.box.com/reference/post-files-content)
- [Box AI Q&A](https://developer.box.com/reference/post-ai-ask)
- [Box AI structured extraction](https://developer.box.com/reference/post-ai-extract-structured)
- [Box metadata instances](https://developer.box.com/guides/metadata/instances/create)
