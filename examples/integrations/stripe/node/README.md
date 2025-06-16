# 🚀 Agentic Credit Card Automation - Node.js

Effortlessly create virtual cards with **Stripe** and automate purchases using **Browserbase** in Node.js/TypeScript.

## 📌 Overview

This Node.js implementation enables you to:
- **Create virtual cards** with spending controls using Stripe Issuing
- **Retrieve virtual card details** securely
- **Automate online purchases** with Playwright and Browserbase

## 🛠️ Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Stripe account with Issuing enabled
- Browserbase account

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
Create a `.env` file in this directory:
```env
STRIPE_API_KEY=sk_test_your_stripe_secret_key
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id
```

3. **Install Playwright browsers**:
```bash
npm run postinstall
```

## 🚀 Usage

### Step 1: Create a Cardholder
```bash
npx tsx 1-create-cardholder.ts
```

### Step 2: Create a Virtual Card
```bash
npx tsx 2-create-card.ts
```
⚠️ **Important**: Update the `cardholderId` variable with the ID from Step 1

### Step 3: Retrieve Card Details
```bash
npx tsx 3-get-card.ts
```
⚠️ **Important**: Update the `cardId` variable with the ID from Step 2

### Step 4: Make an Automated Payment
```bash
npx tsx 4-make-payment.ts
```
⚠️ **Important**: Update the `cardId` variable with the ID from Step 2

## 📁 Files

| File | Description |
|------|-------------|
| `1-create-cardholder.ts` | Creates a Stripe cardholder with billing information |
| `2-create-card.ts` | Creates a virtual card with spending limits |
| `3-get-card.ts` | Retrieves card details including sensitive information |
| `4-make-payment.ts` | Automates a donation using Playwright and Browserbase |
| `package.json` | Node.js dependencies and scripts |
| `.env` | Environment variables (not tracked in git) |

## 🔧 Configuration

### Spending Controls
Edit `2-create-card.ts` to customize:
- **Allowed categories**: Restrict card usage to specific merchant categories
- **Spending limits**: Set daily/monthly/yearly limits
- **Blocked categories**: Prevent usage at certain merchant types

### Payment Automation
Modify `4-make-payment.ts` to:
- Change the target website
- Customize form filling logic
- Add error handling and validation

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use test API keys for development
- Implement proper error handling in production
- Consider using Stripe webhooks for real-time updates

## 📖 Documentation

For full API documentation and advanced usage:
📄 **[Stripe Issuing API](https://stripe.com/docs/issuing)**
📄 **[Browserbase Documentation](https://docs.browserbase.com)**

## 🎯 Example Use Cases

- **Expense management**: Create cards for specific projects or employees
- **Testing payments**: Automate payment flow testing
- **Subscription management**: Programmatically manage recurring payments
- **Budget enforcement**: Set spending limits per card or category 