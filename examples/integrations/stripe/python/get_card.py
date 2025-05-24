import stripe
import os
import dotenv
dotenv.load_dotenv()

stripe.api_key = os.getenv("STRIPE_API_KEY")

def getCard(card_id):
    card = stripe.issuing.Card.retrieve(card_id, expand=['number', 'cvc'])

    card_info = {
        'cardholder_firstName': card.cardholder.name.split(' ')[0],
        'cardholder_lastName': card.cardholder.name.split(' ')[1],
        'cardholder_email': card.cardholder.email,
        'cardholder_phone': card.cardholder.phone_number,
        'cardholder_address': card.cardholder.billing.address,
        'card_number': card.number,
        'expiration_month': card.exp_month,
        'expiration_year': str(card.exp_year)[-2:], # 2028 -> 28
        'cvc': card.cvc,
        'brand': card.brand,
        'currency': card.currency,
    }
    print('Card info:', card_info)
    return card_info

# card_id = "ic_REPLACE_WITH_YOUR_CARD_ID_HERE" # replace with your card id from the previous step
# card_info = getCard(card_id)