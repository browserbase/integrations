import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_API_KEY!);

async function createCard(cardholderId: string) {
    const card = await stripe.issuing.cards.create({
        cardholder: cardholderId,
        currency: 'usd',
        type: 'virtual',
        spending_controls: {
            allowed_categories: ['charitable_and_social_service_organizations_fundraising'],
            // Choose to block certain categories instead of allowing them
            // blocked_categories: ['automated_cash_disburse'],
            spending_limits: [{
                amount: 7500, // $75.00 measured in cents
                interval: 'daily', // all_time, daily, weekly, monthly, yearly, per_authorization
            }],
        },
    });

    console.log('Card created:', card.id);
    return card;
}

const cardholderId = "ich_INPUT_CARDHOLDER_ID_HERE"; // replace with your cardholder id from the previous step
const virtual_card = createCard(cardholderId);