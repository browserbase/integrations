# Voice Agent with Real-time Web Form Filling

This project demonstrates an advanced voice agent that conducts phone questionnaires while automatically filling out web forms in real-time using Stagehand browser automation.

## Features

- **Voice Conversations**: Natural voice interactions using Cartesia Line
- **Real-time Form Filling**: Automatically fills web forms as answers are collected
- **Browser Automation**: Uses Stagehand AI to interact with any web form
- **Intelligent Mapping**: AI-powered mapping of voice answers to form fields
- **Async Processing**: Non-blocking form filling maintains conversation flow - form fields are filled in background tasks without delaying voice responses
- **Auto-submission**: Submits forms automatically when complete

## Architecture

```
Voice Call (Cartesia) → Form Filling Node → Records Answer
                              ↓
                     Stagehand Browser API
                              ↓
                     Fills Web Form Field
                              ↓
                     Continues Conversation
                              ↓
                     Submits Form on Completion
```

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Add your GEMINI_API_KEY
```

3. Run the agent:
```bash
python main.py
```

## Components

### StagehandFormFiller
- Manages browser automation
- Opens and controls web forms
- Maps conversation data to form fields
- Handles form submission

### FormFillingNode
- Voice-optimized reasoning node
- Integrates Stagehand browser automation
- Manages async form filling during conversation
- Provides status updates

### FormFieldMapping
- Maps YAML questions to web form fields
- Transforms voice answers to form-compatible formats
- Handles different field types (text, select, checkbox, etc.)

## Configuration

The system can be configured through:

- `form.yaml`: Define questionnaire structure
- `FORM_URL`: Target web form to fill
- `headless`: Run browser in background (True) or visible (False) - currently set to True for production use
- `enable_browser`: Toggle browser automation on/off

## Example Flow

1. User calls the voice agent
2. Agent asks: "What type of voice agent are you building?"
3. User responds: "A customer service agent"
4. System:
   - Records the answer
   - Opens browser to form (if not already open)
   - Fills "Customer Service" in the role selection field
   - Takes screenshot for debugging
5. Agent asks next question
6. Process continues until all questions answered
7. Form is automatically submitted

## Advanced Features

- **Background Processing**: Form filling happens asynchronously using background tasks - conversation remains smooth and responsive
- **Error Recovery**: Continues conversation even if form filling fails
- **Progress Tracking**: Monitor form completion status
- **Screenshot Debugging**: Captures screenshots after each field
- **Flexible Mapping**: AI interprets answers for different field types

## Testing

Test with different scenarios:
- Complete questionnaire flow
- Interruptions and corrections
- Various answer formats
- Multi-page forms
- Form validation errors

## Production Considerations

- Set `headless=True` for production (currently configured this way)
- Configure proper error logging
- Add retry logic for form submission
- Implement form validation checks
- Consider rate limiting for API calls