import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { StagehandCodeExecutor } from '../src/executor.js';
import { createCodeModeMcpServer } from '../src/mcp-server.js';
import type { CodeRuntime } from '../src/types.js';

describe('code-mode MCP', () => {
  it('discovers and invokes exactly one code_execute tool', async () => {
    const runtime: CodeRuntime = {
      run: async code => ({
        value: { echoed: code },
        logs: [],
        page: { url: 'https://example.com/', title: 'Example Domain' },
      }),
      close: async () => undefined,
    };
    const executor = new StagehandCodeExecutor({
      runtimeFactory: () => runtime,
    });
    const server = createCodeModeMcpServer(executor);
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      const discovered = await client.listTools();
      expect(discovered.tools.map(entry => entry.name)).toEqual([
        'code_execute',
      ]);
      expect(discovered.tools[0]?.inputSchema.required).toEqual(['code']);
      expect(discovered.tools[0]?.description).toContain(
        'Stagehand V4 code-mode syntax'
      );

      const result = await client.callTool({
        name: 'code_execute',
        arguments: { code: 'return 42' },
      });
      expect(result.isError).toBe(false);
      expect(result.structuredContent).toMatchObject({
        ok: true,
        browser_state: 'preserved',
        value: { echoed: 'return 42' },
      });
    } finally {
      await client.close();
      await server.close();
      await executor.close();
    }
  });
});
