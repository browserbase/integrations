import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_API_KEY!);

export async function getCard(cardId: string) {
    const card = await stripe.issuing.cards.retrieve(
        cardId, {expand: ['number', 'cvc']});

    const cardInfo = {
        cardholder_firstName: card.cardholder.name.split(' ')[0],
        cardholder_lastName: card.cardholder.name.split(' ')[1],
        cardholder_email: card.cardholder.email,
        cardholder_phone: card.cardholder.phone_number,
        cardholder_address: card.cardholder.billing.address,
        card_number: card.number,
        expiration_month: card.exp_month,
        expiration_year: card.exp_year.toString().slice(-2), // 2028 -> 28
        cvc: card.cvc,
        brand: card.brand,
        currency: card.currency,
    };
    console.log('Card info:', cardInfo);
    return cardInfo;
}

const cardId = "ic_INPUT_CARD_ID_HERE"; // replace with your card id from the previous step
getCard(cardId);