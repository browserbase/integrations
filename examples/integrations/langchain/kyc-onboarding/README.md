# LangChain Deep Agents + KYC Onboarding (Python)

This example builds a KYC onboarding agent that runs automated due diligence on a company
using LangChain Deep Agents for orchestration, Stagehand for browser interactions, and
Browserbase for headless browser sessions.

The agent navigates real portals — Secretary of State sites, FinCEN BOI, OFAC, PACER, SEC EDGAR,
and news publishers — rather than relying on search or fetch APIs alone. Browserbase Agent Identity
handles anti-bot measures and CAPTCHAs automatically.

## Architecture

**Phase 1 — five-track fan-out:**

| Subagent | Portals |
|---|---|
| `corporate-registry` | Secretary of State portals (Delaware, California, New York, UK Companies House) |
| `beneficial-ownership` | FinCEN BOI, UK PSC register, EU member-state registries |
| `sanctions-pep` | OFAC SDN, EU consolidated list, UK HMT financial sanctions |
| `litigation-regulatory` | PACER, state courts, SEC EDGAR |
| `adverse-media` | Reuters, Bloomberg, FT, WSJ, SEC newsroom, DOJ press releases |

**Phase 2 — individual KYC fan-out:**

After the `beneficial-ownership` subagent returns a list of ultimate beneficial owners (UBOs),
the orchestrator delegates one `individual-kyc` subagent call per person. Each individual check
covers sanctions screening, PEP status, and adverse media.

**Tools (defined in `kyc_tools.py`):**

- `kyc_search`: Browserbase Search for initial discovery before opening portals
- `kyc_fetch`: Browserbase Fetch for static pages (EDGAR filings, public registries)
- `kyc_extract_from_portal`: opens a Browserbase session and extracts structured data from a
  rendered portal page using Stagehand `extract`
- `kyc_search_portal`: opens a Browserbase session and runs a multi-step browser task (form fills,
  paginated search navigation) using a Stagehand agent — gated behind human approval

Every browser session produces a session replay URL included in the tool response for audit purposes.

## Requirements

- Python 3.11+
- `BROWSERBASE_API_KEY` for Browserbase Search, Fetch, and browser sessions (including Stagehand)
- An OpenAI-compatible model for the Deep Agent orchestrator

The sample accepts `OPENAI_API_KEY` for direct OpenAI access, or `BROWSERBASE_API_KEY` paired with
`DEEPAGENT_BASE_URL` for a Browserbase-backed OpenAI-compatible gateway.

Default models:
- Deep Agent orchestrator: `gpt-4o`
- Stagehand extraction: `google/gemini-3-flash-preview`
- Stagehand interactive agent: `anthropic/claude-sonnet-4-6`

## Install

```bash
cd examples/integrations/langchain/kyc-onboarding
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```ini
BROWSERBASE_API_KEY=bb_...

# Use direct OpenAI
OPENAI_API_KEY=sk-...

# Or use the Browserbase Model Gateway instead (no separate OpenAI key needed)
# DEEPAGENT_BASE_URL=https://<your-gateway>

# Optional model overrides
# DEEPAGENT_MODEL=gpt-5.4
# STAGEHAND_MODEL=google/gemini-3-flash-preview
# STAGEHAND_AGENT_MODEL=anthropic/claude-sonnet-4-6
```

## Run

Use the default demo company:

```bash
python main.py
```

Run on a specific company and jurisdiction:

```bash
python main.py "Stripe, Inc." --jurisdiction Delaware
python main.py "Revolut Ltd" --jurisdiction "United Kingdom"
```

Override the model:

```bash
python main.py "Acme Corp Inc." --jurisdiction Delaware --model gpt-4o
```

## Approval flow

`kyc_search_portal` is gated behind `interrupt_on`. Whenever the agent wants to submit a search
form, navigate paginated results, or interact with a portal, the script pauses and prompts:

```
Pending tool call
Tool: kyc_search_portal
Arguments:
{
  "start_url": "https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx",
  "task": "Search for 'Acme Corp Inc.' and extract the entity status, formation date, and registered agent."
}
Allowed decisions: approve, edit, reject
Decision [approve/edit/reject]:
```

- `approve` — run the task as proposed
- `edit` — provide replacement JSON args before running
- `reject` — skip this action

This puts human review at the tool boundary rather than inside ad hoc shell calls.

## Notes

- `kyc_extract_from_portal` maps to Stagehand `extract` — structured, read-only extraction from a rendered page.
- `kyc_search_portal` maps to Stagehand `agent().execute()` — multi-step agentic browsing for portals that require interaction.
- Browserbase Agent Identity manages browser fingerprinting, residential proxy routing, and CAPTCHA solving. No additional configuration is needed beyond `BROWSERBASE_API_KEY`.
- Each `kyc_search_portal` and `kyc_extract_from_portal` response includes a `session_url` field linking to the Browserbase session replay. These replays provide visual evidence for audit workpapers.
- The individual-kyc Phase 2 fan-out is driven by the orchestrator parsing the `beneficial-ownership` subagent report. If the registry is not publicly searchable, the subagent notes this explicitly and Phase 2 proceeds with whatever names were found.

## Suggested prompts

- `python main.py "Anthropic, PBC" --jurisdiction Delaware`
- `python main.py "Klarna Bank AB" --jurisdiction Sweden`
- `python main.py "Acme Corp Inc." --jurisdiction Delaware` (demo company, expect sparse results)
