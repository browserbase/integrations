let configured = false;

process.on('message', message => {
  if (!message || typeof message !== 'object') return;
  if (message.type === 'configure') {
    configured = true;
    process.send?.({ id: message.id, ok: true });
    return;
  }
  if (message.type === 'close') {
    process.send?.({ id: message.id, ok: true, result: { closed: true } });
    setImmediate(() => process.exit(0));
    return;
  }
  if (!configured || message.type !== 'run') return;
  if (message.code === 'hang') return;
  if (message.code === 'runtime-error') {
    process.send?.({
      id: message.id,
      ok: false,
      error: {
        name: 'Error',
        message: 'controlled failure',
        kind: 'runtime',
        retryable: false,
        mayHaveSideEffects: false,
        browserStateLost: false,
      },
    });
    return;
  }
  process.send?.({
    id: message.id,
    ok: true,
    result: {
      value: {
        pathPresent: typeof process.env.PATH === 'string',
        testSecret: process.env.CODEMODE_TEST_SECRET,
      },
      logs: [],
      page: { url: 'https://example.com/', title: 'Example Domain' },
    },
  });
});
