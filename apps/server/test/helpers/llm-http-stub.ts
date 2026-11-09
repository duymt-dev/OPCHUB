import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Real local HTTP boundary; deterministic scenarios, no calls to a paid provider. */
export async function llmHttpStub() {
  const requests: { path: string; authorization: string; body: string }[] = [];
  let mode: 'ok' | 'unauthorized' | 'malformed' | 'timeout' | 'unavailable' | 'rate' = 'ok';
  let content = 'OK from local stub';
  let delayMs = 0;
  let usage: { prompt_tokens: number; completion_tokens: number } | undefined;
  const server = createServer((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      }
      requests.push({
        path: req.url ?? '',
        authorization: req.headers.authorization ?? '',
        body: Buffer.concat(chunks).toString('utf8'),
      });
      if (mode === 'timeout') return;
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      res.setHeader('content-type', 'application/json');
      if (mode === 'unavailable' || mode === 'rate') {
        res.statusCode = mode === 'rate' ? 429 : 503;
        res.end('{}');
      } else if (mode === 'unauthorized') {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: 'provider-private-detail' }));
      } else if (mode === 'malformed') {
        res.end(JSON.stringify({ choices: 'invalid provider-private-detail' }));
      } else {
        res.end(
          JSON.stringify({
            ...(usage ? { usage } : {}),
            choices: [{ message: { content }, finish_reason: 'stop' }],
          }),
        );
      }
    })().catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}/v1`,
    requests,
    setDelay(value: number) {
      delayMs = value;
    },
    setUsage(value: typeof usage) {
      usage = value;
    },
    setContent(value: string) {
      content = value;
    },
    setMode(value: typeof mode) {
      mode = value;
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
