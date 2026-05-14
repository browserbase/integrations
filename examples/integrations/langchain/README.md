# Langchain Integration Examples

This directory contains examples of integrating Langchain with our web automation tools:

1. **Browserbase Integration** (`browserbase/`): A lightweight solution for web scraping and data extraction using our managed browser infrastructure.

2. **Stagehand Integration** (`stagehand/`): Full web automation capabilities using our open-source AI-powered browser automation SDK.

3. **Deep Agents + Browserbase** (`deepagents-browserbase/`): A Python example combining LangChain Deep Agents with Browserbase Search, Fetch, and Stagehand browser sessions for research workflows.

4. **KYC Onboarding Agent** (`kyc-onboarding/`): A Python example that runs automated KYC due diligence on a company using a five-track fan-out (corporate registry, beneficial ownership, sanctions, litigation, adverse media) and per-owner individual KYC checks. Uses Deep Agents for orchestration and Stagehand for portal navigation.

5. **Patent Landscape Agent** (`patent-landscape-agent/`): A Python example that researches a patent landscape across USPTO, EPO, and WIPO using a three-phase workflow — parallel five-track research (granted patents, prosecution history, ownership, PTAB litigation, inventor network), per-family deep dives, and final memo synthesis. Uses OpenAI as the single model provider for both the Deep Agents orchestrator and Stagehand browser sessions.

Choose the example that best fits your needs:
- Use Browserbase for simple web scraping and data collection
- Use Stagehand for complex automation workflows with AI-driven interactions
- Use Deep Agents + Browserbase for multi-step research agents with human approval gates
- Use KYC Onboarding for compliance workflows that navigate gated portals and forms
- Use Patent Landscape Agent for multi-source research with persistent workpapers and structured memo output

See the respective directories for detailed implementation guides.