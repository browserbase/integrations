import stripe
import os
import dotenv
dotenv.load_dotenv()

stripe.api_key = os.getenv("STRIPE_API_KEY")

def create_cardholder():
    cardholder = stripe.issuing.Cardholder.create(
        name="Browserbase User",
        email="hello@browserbase.com",
        phone_number="+15555555555",
        status='active',
        type='individual',
        billing={
            "address": {
                "line1": "123 Main Street",
                "city": "San Francisco",
                "state": "CA",
                "country": "US",
                "postal_code": "94111",
            }
        },
    )
    print("Cardholder created:", cardholder.id)
    return cardholder

card_holder = create_cardholder()