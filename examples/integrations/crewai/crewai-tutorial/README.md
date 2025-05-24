# Tutorial: build a Flight Booking Crew
### Build a Crew that finds the best roundtrip flights on the given dates.

This is based off the guide in the [Browserbase docs](https://docs.browserbase.com/integrations/crew-ai/build-a-flight-booker)

## Setup

This project uses [Poetry](https://python-poetry.org/) for dependency management.
You can install dependencies here either by running `poetry install` or `pip install .`

You will also need to set up a `.env` file with the following variables:

```bash
BROWSERBASE_API_KEY=your-browserbase-api-key
BROWSERBASE_PROJECT_ID=your-browserbase-project-id
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL_NAME=gpt-4-turbo
```

## Running the Crew

To run the Crew, run `poetry run python main.py "flights from SF to New York on November 5th"`

