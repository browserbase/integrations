import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

async function createCardholder() {
    const cardholder = await stripe.issuing.cardholders.create({
        name: "Browserbase User",
        email: "hello@browserbase.com",
        phone_number: "+15555555555",
        status: 'active',
        type: 'individual',
        billing: {
            address: {
            line1: '123 Main Street',
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
            postal_code: '94111',
            }
        },
    });
    console.log("Cardholder created:", cardholder.id);
    return cardholder;
}

const cardholder = createCardholder();