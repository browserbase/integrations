import { defineAgent } from 'eve';

export default defineAgent({
  model: 'openai/gpt-5.4-mini',
  build: {
    externalDependencies: ['@browserbasehq/stagehand'],
  },
});
