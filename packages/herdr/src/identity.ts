import type { BrowserMode } from './types.js';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

export function sanitizeIdentifier(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return sanitized || 'unknown';
}

export function isLocalUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    LOCAL_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.test')
  );
}

export function selectMode(url: string, override?: BrowserMode): BrowserMode {
  return override ?? (isLocalUrl(url) ? 'local' : 'cloud');
}

function agentFromContext(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const context = JSON.parse(raw) as {
      agent?: { name?: string; label?: string };
    };
    return context.agent?.name ?? context.agent?.label;
  } catch {
    return undefined;
  }
}

export interface HerdrIdentity {
  workspaceId: string;
  actorId: string;
  browseSession: string;
}

export function deriveIdentity(
  env: NodeJS.ProcessEnv = process.env
): HerdrIdentity {
  const workspaceId = env.HERDR_WORKSPACE_ID;
  if (!workspaceId) {
    throw new Error(
      'HERDR_WORKSPACE_ID is missing. Run herdr-browse inside a Herdr workspace.'
    );
  }

  const actorId =
    agentFromContext(env.HERDR_PLUGIN_CONTEXT_JSON) ??
    env.HERDR_PANE_ID ??
    'workspace';
  const browseSession = `herdr-${sanitizeIdentifier(workspaceId)}-${sanitizeIdentifier(actorId)}`;
  return { workspaceId, actorId, browseSession };
}
