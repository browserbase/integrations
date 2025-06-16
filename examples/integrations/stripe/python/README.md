# 🚀 Agentic Credit Card Automation - Python

Effortlessly create virtual cards with **Stripe** and automate purchases using **Browserbase** in Python.

## 📌 Overview

This Python implementation enables you to:
- **Create virtual cards** with spending controls using Stripe Issuing
- **Retrieve virtual card details** securely
- **Automate online purchases** with Playwright and Browserbase

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- pip or poetry
- Stripe account with Issuing enabled
- Browserbase account

### Installation

1. **Install dependencies**:
```bash
pip install -r requirements.txt
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
playwright install
```

## 🚀 Usage

### Step 1: Create a Cardholder
```bash
python create_cardholder.py
```

### Step 2: Create a Virtual Card
```bash
python create_card.py
```
⚠️ **Important**: Update the `cardholder_id` variable with the ID from Step 1

### Step 3: Retrieve Card Details
```bash
python get_card.py
```
⚠️ **Important**: Uncomment and update the `card_id` variable with the ID from Step 2

### Step 4: Make an Automated Payment
```bash
python make-payment.py
```
⚠️ **Important**: Update the `cardId` variable with the ID from Step 2

## 📁 Files

| File | Description |
|------|-------------|
| `create_cardholder.py` | Creates a Stripe cardholder with billing information |
| `create_card.py` | Creates a virtual card with spending limits |
| `get_card.py` | Retrieves card details including sensitive information |
| `make-payment.py` | Automates a donation using Playwright and Browserbase |
| `requirements.txt` | Python dependencies |
| `.env` | Environment variables (not tracked in git) |

## 🔧 Configuration

### Spending Controls
Edit `create_card.py` to customize:
- **Allowed categories**: Restrict card usage to specific merchant categories
- **Spending limits**: Set daily/monthly/yearly limits  
- **Blocked categories**: Prevent usage at certain merchant types

### Payment Automation
Modify `make-payment.py` to:
- Change the target website
- Customize form filling logic
- Add error handling and validation

## 🐍 Python-Specific Features

### Virtual Environment (Recommended)
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Error Handling
The Python implementation includes:
- Environment variable validation
- Stripe API error handling
- Playwright timeout management

### Dependencies
- **stripe**: Official Stripe Python library
- **browserbasehq**: Browserbase SDK for Python
- **playwright**: Browser automation framework
- **python-dotenv**: Environment variable management

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use test API keys for development
- Implement proper exception handling in production
- Consider using Stripe webhooks for real-time updates
- Always validate sensitive card data before use

## 📖 Documentation

For full API documentation and advanced usage:
📄 **[Stripe Python SDK](https://stripe.com/docs/api/python)**
📄 **[Browserbase Python SDK](https://docs.browserbase.com/sdk/python)**
📄 **[Playwright Python](https://playwright.dev/python/)**

## 🎯 Example Use Cases

- **Financial automation**: Automate expense reporting and payment processing
- **E-commerce testing**: Test payment flows across multiple platforms
- **Budget management**: Create spending-limited cards for different departments
- **Subscription automation**: Programmatically manage recurring payments

## 🚨 Troubleshooting

### Common Issues
- **Import errors**: Ensure all dependencies are installed via `pip install -r requirements.txt`
- **Playwright errors**: Run `playwright install` to download browser binaries
- **Stripe API errors**: Verify your API keys and account permissions
- **Environment variables**: Double-check your `.env` file formatting 