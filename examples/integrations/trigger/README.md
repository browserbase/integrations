# Browserbase + Trigger.dev Integration

## Overview

Trigger.dev is a background job framework that enables you to create, run, and monitor background tasks with built-in retry logic, scheduling, and observability. This integration showcases multiple use cases:

- **PDF Processing**: Convert PDFs to images and upload to cloud storage
- **Web Scraping**: Extract data from websites using Puppeteer and Browserbase
- **Document Generation**: Create PDFs from React components
- **Email Automation**: Scheduled tasks with email notifications
- **Task Hierarchies**: Complex workflows with parent-child task relationships

## Task Examples

### 1. PDF to Image Conversion (`pdf-to-image.tsx`)
Converts PDF documents to PNG images using MuPDF and uploads them to Cloudflare R2 storage.

**Features:**
- Downloads PDF from URL
- Converts each page to PNG using `mutool`
- Uploads images to R2 bucket
- Returns array of image URLs
- Automatic cleanup of temporary files

### 2. Puppeteer Web Scraping (`puppeteer-*.tsx`)

#### Basic Page Title Extraction
Simple example that launches Puppeteer, navigates to Google, and logs the page title.

#### Scraping with Browserbase Proxy
Uses Browserbase's cloud browser infrastructure to scrape data through a proxy:
- Connects to Browserbase WebSocket endpoint
- Scrapes GitHub star count from trigger.dev website
- Handles errors gracefully

#### Webpage to PDF Generation
Converts web pages to PDF documents:
- Navigates to target URL
- Generates PDF from webpage
- Uploads PDF to cloud storage

### 3. React PDF Generation (`react-pdf.tsx`)
Creates PDF documents using React components and @react-pdf/renderer:
- Accepts text payload
- Renders PDF using React components
- Uploads generated PDF to cloud storage
- Returns PDF URL

### 4. Hacker News Summarization (`summarize-hn.tsx`)
Scheduled task that runs weekdays at 9 AM (London time):

**Workflow:**
1. **Scrapes Hacker News** - Gets top 3 articles
2. **Batch Processing** - Triggers child tasks for each article
3. **Content Extraction** - Scrapes full article content
4. **AI Summarization** - Uses OpenAI GPT-4 to create summaries
5. **Email Delivery** - Sends formatted email with summaries

**Features:**
- Scheduled execution with cron syntax
- Batch task processing with `batchTriggerAndWait`
- Retry logic with exponential backoff
- Request interception to optimize scraping
- Email templates using React Email

### 5. Task Hierarchy (`taskHierarchy.ts`)
Demonstrates complex task workflows with parent-child relationships:
- **Root Task** → **Child Task** → **Grandchild Task** → **Great-grandchild Task**
- Shows both synchronous (`triggerAndWait`) and asynchronous (`trigger`) patterns
- Batch processing capabilities
- Run hierarchy logging and visualization

## Configuration

### Trigger.dev Config (`trigger.config.ts`)
```typescript

export default defineConfig({
  project: "proj_ljbidlufugyxuhjxzkyy", // your Trigger Project ID
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
    ],
  },
});
```

**Key Features:**
- **System Dependencies**: Installs MuPDF tools and curl via `aptGet` extension
- **Puppeteer Extension**: Automatically sets up Puppeteer with Chrome
- **Retry Configuration**: Global retry settings with exponential backoff
- **Development Mode**: Retries enabled in development environment

## Dependencies

Key packages used in this integration:

```json
{
  "@trigger.dev/sdk": "3.0.13",
  "@trigger.dev/build": "3.0.13",
  "@aws-sdk/client-s3": "^3.651.0",
  "@react-pdf/renderer": "^3.4.4",
  "@react-email/components": "^0.1.0",
  "puppeteer": "^23.4.0",
  "puppeteer-core": "^23.5.3",
  "openai": "^4.67.3",
  "resend": "^4.0.0"
}
```

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Trigger.dev Configuration
TRIGGER_SECRET_KEY=your-trigger-secret-key

# Browserbase Configuration (for web scraping)
BROWSERBASE_API_KEY=your-browserbase-api-key
BROWSERBASE_PROJECT_ID=your-browserbase-project-id

# Cloudflare R2 Storage Configuration (for file uploads)
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
S3_BUCKET=your-r2-bucket-name

# OpenAI Configuration (for AI summarization)
OPENAI_API_KEY=your-openai-api-key

# Resend Configuration (for email delivery)
RESEND_API_KEY=your-resend-api-key
```

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Copy the environment variables above into a `.env.local` file and fill in your actual values.

3. **Start development server:**
```bash
npm run dev
```

4. **Deploy to Trigger.dev:**
```bash
npx trigger.dev@latest deploy
```

## Machine Presets

Tasks can specify machine requirements:
```typescript
export const puppeteerBasicTask = task({
  id: "puppeteer-log-title",
  machine: {
    preset: "large-1x",
  },
  // ...
});
```

Available presets provide different CPU/memory configurations for resource-intensive tasks.

## Error Handling & Retries

All tasks include comprehensive error handling:
- **Automatic retries** with exponential backoff
- **Resource cleanup** (browser instances, temporary files)
- **Detailed logging** for debugging
- **Graceful failure** handling

## Integration Services

This example integrates with several external services:
- **Browserbase**: Cloud browser infrastructure for web scraping
- **Cloudflare R2**: Object storage for files
- **OpenAI**: AI-powered content summarization
- **Resend**: Email delivery service
- **React Email**: Email template rendering

## Use Cases

Perfect for:
- **Document processing workflows**
- **Web scraping and data extraction**
- **Automated content generation**
- **Scheduled reporting and notifications**
- **Complex multi-step background processes**
