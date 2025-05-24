import stripe
import os
import dotenv
dotenv.load_dotenv()

stripe.api_key = os.getenv("STRIPE_API_KEY")

def create_card(cardholder_id):
    card = stripe.issuing.Card.create(
        cardholder=cardholder_id,
        currency='usd',
        type='virtual',
        spending_controls={
            "allowed_categories": ['charitable_and_social_service_organizations_fundraising'],
            # Choose to block certain categories instead of allowing them
            # "blocked_categories": ['automated_cash_disburse'],
            "spending_limits": [
                {
                    "amount": 7500,  # measured in cents
                    "interval": "daily",  # all_time, daily, weekly, monthly, yearly, per_authorization
                }
            ]
        },
    )
    print("Card created:", card.id)
    return card

cardholder_id = "ich_1Qu7sDGhqv5yXZ4397Vp4eAC"
virtual_card = create_card(cardholder_id)