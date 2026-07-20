import browserbase from '@browserbasehq/eve';

export default browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
  model: 'openai/gpt-5.4-mini',
});
