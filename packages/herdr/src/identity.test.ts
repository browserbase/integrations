import { describe, expect, it } from 'vitest';
import {
  deriveIdentity,
  isLocalUrl,
  sanitizeIdentifier,
  selectMode,
} from './identity.js';

describe('browser identity', () => {
  it.each([
    'http://localhost:3000',
    'https://app.localhost',
    'http://127.0.0.1:8787',
    'http://[::1]:4321',
    'https://project.local',
    'https://project.test',
  ])('recognizes %s as local', url => expect(isLocalUrl(url)).toBe(true));

  it('routes deployed URLs to cloud unless overridden', () => {
    expect(selectMode('https://example.com')).toBe('cloud');
    expect(selectMode('https://example.com', 'local')).toBe('local');
    expect(selectMode('http://localhost:3000', 'cloud')).toBe('cloud');
  });

  it('derives separate sessions for separate agents', () => {
    const first = deriveIdentity({
      HERDR_WORKSPACE_ID: 'Workspace 1',
      HERDR_PLUGIN_CONTEXT_JSON: JSON.stringify({ agent: { name: 'Claude' } }),
    });
    const second = deriveIdentity({
      HERDR_WORKSPACE_ID: 'Workspace 1',
      HERDR_PLUGIN_CONTEXT_JSON: JSON.stringify({ agent: { name: 'Codex' } }),
    });
    expect(first.browseSession).toBe('herdr-workspace-1-claude');
    expect(second.browseSession).toBe('herdr-workspace-1-codex');
  });

  it('sanitizes values used as browse session names', () => {
    expect(sanitizeIdentifier('w1:p1 / Main')).toBe('w1-p1-main');
  });
});
