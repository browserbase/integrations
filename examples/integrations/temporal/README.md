# Temporal + Stagehand Integration

A simplified example showing how Temporal handles browser automation failures with automatic retries.

## What it does

- Uses Stagehand to perform Google searches in a real browser
- Temporal automatically retries when browser sessions fail
- No artificial failure simulation - relies on real network/browser issues
- Clean, simple code focused on the retry pattern

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```
BROWSERBASE_API_KEY=your_api_key
BROWSERBASE_PROJECT_ID=your_project_id
ANTHROPIC_API_KEY=your_anthropic_key  # or OPENAI_API_KEY
```

3. Start Temporal (if not already running):
```bash
temporal server start-dev
```

## Running the Example

1. Start the worker in one terminal:
```bash
npm run worker
```

2. Run a search in another terminal:
```bash
npm run demo                    # Default search
npm run demo "your search term" # Custom search
```

## How it Works

1. **Activities** (`research-activities.ts`):
   - `searchWeb`: Opens browser, searches Google, extracts results
   - `formatResults`: Formats results as readable text
   - Natural failures from network issues, timeouts, or page changes

2. **Workflow** (`workflows.ts`):
   - `searchWithRetry`: Orchestrates the search with retry logic
   - Configured for up to 10 retries with exponential backoff
   - 2-minute timeout per attempt

3. **Worker** (`research-worker.ts`):
   - Processes workflow tasks
   - Limits to 2 concurrent browser sessions
   - Simple configuration focused on essentials

## Retry Behavior

Temporal automatically retries on failures like:
- Network timeouts
- Browser session crashes  
- Page load failures
- Element not found errors

The retry policy uses:
- Initial interval: 2 seconds
- Maximum interval: 20 seconds
- Backoff coefficient: 1.8x
- Maximum attempts: 10

## Benefits

- **Simplicity**: Clean code without complex error handling
- **Reliability**: Temporal ensures tasks complete or fail definitively
- **Visibility**: Monitor progress in Temporal Web UI at http://localhost:8233
- **Real-world**: Tests actual browser issues, not simulated failures
