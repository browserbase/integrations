# 🚀 Agentic Credit Card Automation

Effortlessly create virtual cards with **Stripe** and automate purchases using **Browserbase**.

Find the full documentation here: https://docs.browserbase.com/integrations/stripe/introduction

## 📌 Overview

This project enables you to:

- **Create virtual cards** with spending controls using Stripe Issuing
- **Retrieve virtual card details**
- **Automate online purchases**

## 📖 Documentation

For full setup instructions, API details, and code examples, visit the official documentation:

📄 **[Agentic Credit Card Automation Docs](https://docs.browserbase.com/integrations/stripe/introduction)**

# 📂 Structure

```
stripe/
│── node/                # Node.js implementation
│   ├── .env             # Environment variables (ignored in Git)
│   ├── .gitignore
│   ├── package.json     # Node.js dependencies
│   ├── 1-create-cardholder.ts
│   ├── 2-create-card.ts
│   ├── 3-get-card.ts
│   ├── 4-make-payment.ts
│
│── python/              # Python implementation
│   ├── .env
│   ├── .gitignore
│   ├── create_cardholder.py
│   ├── create_card.py
│   ├── get_card.py
│   ├── make-payment.py
│
│── stagehand/           # Stagehand integration for AI-powered automation
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── 1-create-cardholder.ts
│   ├── 2-create-card.ts
│   ├── 3-get-card.ts
│   ├── 4-make-payment.ts
│   ├── stagehand.config.ts
│   ├── index.ts
│   ├── utils.ts
│
│── README.md            # This file
```
