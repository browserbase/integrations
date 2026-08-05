# Authenticated Browserbase Agent + Box AI

This example uses a Browserbase Context to save a real user's login, lets a
Browserbase managed Agent download a private PDF with that authenticated browser
state, then uploads the file to Box for AI Q&A and structured metadata
extraction.

A private PDF in Google Drive is an easy demo: viewers can see the Agent access
a file that is unavailable in a fresh browser, without putting a username,
password, or MFA secret in the Agent task.

## Flow

1. `pnpm setup-context` creates a Browserbase Context and a persistent login
   session.
2. You open Live View, navigate to the configured login page, and authenticate
   normally, including MFA.
3. The setup script ends the session and saves its cookies and browser storage
   to the Context.
4. The managed Agent starts with that Context, opens the private document page,
   and performs a real browser download.
5. The application retrieves the file from the Agent session with the
   Browserbase Downloads API.
6. The PDF is uploaded to Box, where Box AI answers questions, extracts
   structured metadata, and stores the result on the file.

## Setup

```bash
cd examples/integrations/box-managed-agent
pnpm install --ignore-workspace
cp .env.example .env
```

Fill in the Browserbase and Box credentials. For a Google Drive demo:

1. Upload a PDF to your private Drive.
2. Set `AUTH_START_URL` to `https://drive.google.com/drive/my-drive`.
3. Set `PROTECTED_PAGE_URL` to the private PDF's Drive URL.
4. Leave `PROTECTED_PDF_LINK_TEXT=Download`.

Create and authenticate a reusable Context:

```bash
pnpm setup-context
```

Open the Live View URL printed in the terminal, navigate to `AUTH_START_URL`,
and log in. Confirm that the private PDF is accessible, return to the terminal,
and press Enter. Copy the printed ID into `.env` as
`BROWSERBASE_CONTEXT_ID`.

Create the reusable managed Agent:

```bash
pnpm create-agent
```

Copy the printed ID into `.env` as `BROWSERBASE_AGENT_ID`, then run the complete
workflow:

```bash
pnpm start
```

The terminal prints the Agent status and Session Inspector URL, the downloaded
filename, Box AI's answer and extracted fields, and a link to the uploaded Box
file.

If the site later redirects the Agent to its login page, its cookies have
expired. Run `pnpm setup-context` again and replace `BROWSERBASE_CONTEXT_ID`.
Do not run multiple sessions against the same Context at the same time.

## Environment variables

| Variable                  | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `BROWSERBASE_API_KEY`     | Browserbase API key                                |
| `BROWSERBASE_CONTEXT_ID`  | Authenticated Context from `pnpm setup-context`    |
| `BROWSERBASE_AGENT_ID`    | Managed Agent ID from `pnpm create-agent`          |
| `AUTH_START_URL`          | Login page shown during the one-time setup         |
| `PROTECTED_PAGE_URL`      | Private page containing the PDF                    |
| `PROTECTED_PDF_LINK_TEXT` | Name of the download control                       |
| `BOX_CLIENT_ID`           | Box Server App client ID                           |
| `BOX_CLIENT_SECRET`       | Box Server App client secret                       |
| `BOX_ENTERPRISE_ID`       | Enterprise that owns the app's service account     |
| `BOX_FOLDER_ID`           | Destination folder shared with the service account |

## Documentation

- [Browserbase Contexts](https://docs.browserbase.com/platform/browser/core-features/contexts)
- [Integrating managed Agents](https://docs.browserbase.com/platform/agents/integrate-api-sdk)
- [Managing Agent files](https://docs.browserbase.com/platform/agents/managing-files)
- [Browserbase Downloads API](https://docs.browserbase.com/platform/browser/files/downloads)
- [Box AI structured extraction](https://developer.box.com/reference/post-ai-extract-structured)
