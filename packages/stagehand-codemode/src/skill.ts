import { readFileSync } from 'node:fs';

export const STAGEHAND_CODEMODE_SKILL = readFileSync(
  new URL('../SKILL.md', import.meta.url),
  'utf8'
).trim();
