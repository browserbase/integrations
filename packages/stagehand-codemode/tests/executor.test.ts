import { describe, expect, it } from 'vitest';
import { StagehandChildRuntime } from '../src/child-runtime.js';
import { StagehandCodeExecutor } from '../src/executor.js';
import type { CodeRuntime, RuntimeRunResult } from '../src/types.js';
import { CodeModeRuntimeError } from '../src/types.js';

class FakeRuntime implements CodeRuntime {
  active = 0;
  maxActive = 0;
  calls: string[] = [];
  closed = false;

  async run(code: string): Promise<RuntimeRunResult> {
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    this.calls.push(code);
    await new Promise<void>(resolve => setTimeout(resolve, 5));
    this.active -= 1;
    if (code === 'lose-state') {
      throw new CodeModeRuntimeError('timeout', 'timed out', true, {
        mayHaveSideEffects: true,
        browserStateLost: true,
      });
    }
    if (code === 'runtime-error') {
      throw new CodeModeRuntimeError('runtime', 'snippet failed');
    }
    return {
      value: { code },
      logs: [],
      page: { url: 'https://example.com/', title: 'Example Domain' },
    };
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

describe('StagehandCodeExecutor', () => {
  it('creates lazily, serializes calls, and reuses one runtime', async () => {
    const runtimes: FakeRuntime[] = [];
    const executor = new StagehandCodeExecutor({
      runtimeFactory: () => {
        const runtime = new FakeRuntime();
        runtimes.push(runtime);
        return runtime;
      },
    });

    expect(runtimes).toHaveLength(0);
    const [first, second] = await Promise.all([
      executor.execute({ code: 'first' }),
      executor.execute({ code: 'second' }),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(runtimes).toHaveLength(1);
    expect(runtimes[0]?.calls).toEqual(['first', 'second']);
    expect(runtimes[0]?.maxActive).toBe(1);
    await executor.close();
    expect(runtimes[0]?.closed).toBe(true);
  });

  it('discards a lost browser and creates a fresh runtime on the next call', async () => {
    const runtimes: FakeRuntime[] = [];
    const executor = new StagehandCodeExecutor({
      runtimeFactory: () => {
        const runtime = new FakeRuntime();
        runtimes.push(runtime);
        return runtime;
      },
    });

    const failed = await executor.execute({ code: 'lose-state' });
    expect(failed).toMatchObject({
      ok: false,
      browser_state: 'discarded',
      error: { kind: 'timeout', may_have_side_effects: true },
    });
    expect(runtimes[0]?.closed).toBe(true);

    const recovered = await executor.execute({ code: 'fresh' });
    expect(recovered.ok).toBe(true);
    expect(runtimes).toHaveLength(2);
    await executor.close();
  });

  it('preserves the browser after an ordinary snippet error', async () => {
    const runtimes: FakeRuntime[] = [];
    const executor = new StagehandCodeExecutor({
      runtimeFactory: () => {
        const runtime = new FakeRuntime();
        runtimes.push(runtime);
        return runtime;
      },
    });

    const failed = await executor.execute({ code: 'runtime-error' });
    expect(failed).toMatchObject({
      ok: false,
      browser_state: 'preserved',
      error: { kind: 'runtime', retryable: false },
    });
    const recovered = await executor.execute({ code: 'same-browser' });
    expect(recovered.ok).toBe(true);
    expect(runtimes).toHaveLength(1);
    expect(runtimes[0]?.closed).toBe(false);
    await executor.close();
  });

  it('rejects invalid input without creating a runtime', async () => {
    let created = 0;
    const executor = new StagehandCodeExecutor({
      runtimeFactory: () => {
        created += 1;
        return new FakeRuntime();
      },
    });

    await expect(executor.execute({ code: '' })).resolves.toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    await expect(
      executor.execute({ code: 'return 1', timeout_ms: 300_001 })
    ).resolves.toMatchObject({ ok: false, error: { kind: 'validation' } });
    expect(created).toBe(0);
  });
});

describe('StagehandChildRuntime', () => {
  it('filters secrets from the child environment', async () => {
    process.env.CODEMODE_TEST_SECRET = 'must-not-cross-ipc-boundary';
    const runtime = new StagehandChildRuntime(
      {},
      {
        childModuleUrl: new URL(
          './fixtures/controlled-child.mjs',
          import.meta.url
        ),
      }
    );
    try {
      const result = await runtime.run('inspect-env', 2_000);
      expect(result.value).toEqual({ pathPresent: true });
    } finally {
      delete process.env.CODEMODE_TEST_SECRET;
      await runtime.close();
    }
  });

  it('kills a hung child and reports that browser state was lost', async () => {
    const runtime = new StagehandChildRuntime(
      {},
      {
        childModuleUrl: new URL(
          './fixtures/controlled-child.mjs',
          import.meta.url
        ),
      }
    );
    await expect(runtime.run('hang', 20)).rejects.toMatchObject({
      kind: 'timeout',
      browserStateLost: true,
      mayHaveSideEffects: true,
    });
    await runtime.close();
  });
});
