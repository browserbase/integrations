import { defineState } from 'eve/context';

export interface BrowserSessionState {
  id: string | null;
  url: string | null;
}

export const browserSession = defineState<BrowserSessionState>(
  'browser-session',
  () => ({ id: null, url: null })
);
