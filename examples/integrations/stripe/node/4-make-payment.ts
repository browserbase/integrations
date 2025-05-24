import dotenv from 'dotenv';
dotenv.config();
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk/index.mjs";
import { getCard } from './3-get-card';

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY!;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID!;

const cardId = "ic_INPUT_CARD_ID_HERE"; // replace with your card id from the previous step

(async () => {
    const bb = new Browserbase({apiKey: BROWSERBASE_API_KEY});
    const session = await bb.sessions.create({
        projectId: BROWSERBASE_PROJECT_ID,
      });
    const browser = await chromium.connectOverCDP(session.connectUrl);
    const defaultContext = browser.contexts()[0];
    const page = defaultContext.pages()[0];

    const paymentInfo = await getCard(cardId);

    // log session ID url
    console.log(`Session URL: https://www.browserbase.com/sessions/${session.id}`);

    // go to the donation page
    await page?.goto("https://www.redcross.org/donate/donation.html");
    
    // click the first donation amount
    await page?.click("#modf-handle-0-radio");

    // click the continue button
    await page?.click("text=Continue");

    // click the credit card button
    await page?.click("text=credit card");

    // Fill billing information
    await page?.fill("input[name='bill_to_forename']", paymentInfo.cardholder_firstName!);
    await page?.fill("input[name='bill_to_surname']", paymentInfo.cardholder_lastName!);
    await page?.fill("input[name='bill_to_email']", paymentInfo.cardholder_email!);
    await page?.fill("input[name='bill_to_phone']", paymentInfo.cardholder_phone!);

    // Fill in the address information
    await page?.fill("input[name='bill_to_address_line1']", paymentInfo.cardholder_address.line1!);
    await page?.fill("input[name='bill_to_address_city']", paymentInfo.cardholder_address.city!);
    await page?.fill("input[name='bill_to_address_postal_code']", paymentInfo.cardholder_address.postal_code!);
    await page?.selectOption("select#bill_to_address_state", paymentInfo.cardholder_address.state!);

    // Fill in the card information
    await page?.fill("input#cardnumber", paymentInfo.card_number!);
    await page?.fill("input#MM", paymentInfo.expiration_month!.toString());
    await page?.fill("input#YY", paymentInfo.expiration_year!.toString());
    await page?.fill("input#CVC", paymentInfo.cvc!.toString());

    // click donate button
    await page?.click("text=Donate");

    await page.close();
    await browser.close();
})().catch((error) => console.error(error.message));