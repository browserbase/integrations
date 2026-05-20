import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { x } from 'tar';

const TARBALL_BASE = 'https://codeload.github.com/browserbase/skills/tar.gz';
const DEFAULT_SKILLS_REF = 'main';

/**
 * Subdirectory inside the upstream repo that contains skills.
 * Everything under this prefix is extracted to the target root.
 */
const SKILLS_SOURCE_PREFIX = 'skills/';

export type SkillSyncResult = {
  targetRoot: string;
  ref: string;
  filesWritten: string[];
};

export function defaultSkillsRoot(): string {
  return path.join(os.homedir(), '.openclaw', 'skills');
}

export function resolveSkillsRoot(explicitPath?: string): string {
  if (typeof explicitPath === 'string' && explicitPath.trim()) {
    return path.resolve(process.cwd(), explicitPath.trim());
  }

  return defaultSkillsRoot();
}

export function hasBrowserbaseSkills(
  targetRoot = defaultSkillsRoot()
): boolean {
  try {
    const entries = fs.readdirSync(targetRoot, { withFileTypes: true });
    return entries.some(
      e =>
        e.isDirectory() &&
        fs.existsSync(path.join(targetRoot, e.name, 'SKILL.md'))
    );
  } catch {
    return false;
  }
}

export function installedSkillFiles(
  targetRoot = defaultSkillsRoot()
): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        files.push(full);
      }
    }
  }

  walk(targetRoot);
  return files.sort();
}

function normalizeRef(ref?: string): string {
  if (typeof ref !== 'string' || !ref.trim()) {
    return DEFAULT_SKILLS_REF;
  }

  return ref.trim();
}

export async function syncBrowserbaseSkills(options?: {
  targetRoot?: string;
  ref?: string;
  fetchImpl?: typeof fetch;
}): Promise<SkillSyncResult> {
  const targetRoot = resolveSkillsRoot(options?.targetRoot);
  const ref = normalizeRef(options?.ref);
  const fetchImpl = options?.fetchImpl ?? fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error('Global fetch is not available in this runtime.');
  }

  const tarballUrl = `${TARBALL_BASE}/${ref}`;
  const response = await fetchImpl(tarballUrl, {
    headers: { 'user-agent': 'openclaw-browserbase-plugin' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${tarballUrl}`);
  }

  if (!response.body) {
    throw new Error(`Empty response body for ${tarballUrl}`);
  }

  // Extract to a temp directory first, then swap atomically.
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'bb-skills-sync-'));

  try {
    // The tarball has a root directory like "skills-<sha>/" containing "skills/browser/", etc.
    // We want to strip: (1) the repo root prefix, (2) the "skills/" prefix.
    // That's strip: 2, and we filter to only entries under the "skills/" subtree.
    await pipeline(
      Readable.fromWeb(response.body as import('stream/web').ReadableStream),
      x({
        cwd: tmpDir,
        strip: 2,
        filter: entryPath => {
          // Entry paths look like: "skills-<sha>/skills/browser/SKILL.md"
          // After the first "/" is the repo-relative path.
          const repoRelative = entryPath.replace(/^[^/]+\//, '');
          return repoRelative.startsWith(SKILLS_SOURCE_PREFIX);
        },
      })
    );

    // Verify we got something.
    const extracted = installedSkillFiles(tmpDir);
    if (extracted.length === 0) {
      throw new Error('Tarball extracted zero files under the skills/ prefix.');
    }

    // Swap: remove old skills, move new ones in.
    await fsp.rm(targetRoot, { recursive: true, force: true });
    await fsp.mkdir(path.dirname(targetRoot), { recursive: true });
    await fsp.rename(tmpDir, targetRoot);

    const filesWritten = installedSkillFiles(targetRoot);

    return { targetRoot, ref, filesWritten };
  } catch (err) {
    // Clean up temp dir on failure.
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
