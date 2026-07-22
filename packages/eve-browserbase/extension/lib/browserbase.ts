import Browserbase from '@browserbasehq/sdk';

import extension from '../extension';

export function createBrowserbaseClient(): Browserbase {
  return new Browserbase({ apiKey: extension.config.apiKey });
}
