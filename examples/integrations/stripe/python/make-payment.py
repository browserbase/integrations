from playwright.sync_api import Playwright, sync_playwright
from browserbase import Browserbase
from get_card import getCard
import os
import dotenv
dotenv.load_dotenv()

bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])


cardId = "ic_INPUT_CARD_ID_HERE" # replace with your card id from the previous step

def run(playwright: Playwright) -> None:
    session = bb.sessions.create(
        project_id=os.environ["BROWSERBASE_PROJECT_ID"],
    )

    browser = playwright.chromium.connect_over_cdp(session.connect_url)
    context = browser.contexts[0]
    page = context.pages[0]

    payment_info = getCard(cardId)

    # Watch the session
    print(f"Session URL: https://browserbase.com/sessions/{session.id}")

    # Navigate to the donation page
    page.goto("https://www.redcross.org/donate/donation.html")

    # Perform actions on the donation page
    page.click("#modf-handle-0-radio")
    page.click("text=Continue")
    page.click("text=credit card")

    # Fill billing information
    page.fill("input[name='bill_to_forename']", payment_info["cardholder_firstName"])
    page.fill("input[name='bill_to_surname']", payment_info["cardholder_lastName"])
    page.fill("input[name='bill_to_email']", payment_info["cardholder_email"])
    page.fill("input[name='bill_to_phone']", payment_info["cardholder_phone"])

    # Fill in the address information
    page.fill("input[name='bill_to_address_line1']", payment_info["cardholder_address"]["line1"])
    page.fill("input[name='bill_to_address_city']", payment_info["cardholder_address"]["city"])
    page.fill("input[name='bill_to_address_postal_code']", payment_info["cardholder_address"]["postal_code"])
    page.select_option("select#bill_to_address_state", payment_info["cardholder_address"]["state"])

    # Fill in the card information
    page.fill("input#cardnumber", payment_info["card_number"])
    page.fill("input#MM", str(payment_info["expiration_month"]))
    page.fill("input#YY", str(payment_info["expiration_year"]))
    page.fill("input#CVC", str(payment_info["cvc"]))

    # Click donate button
    page.click("text=Donate")

    page.close()
    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
