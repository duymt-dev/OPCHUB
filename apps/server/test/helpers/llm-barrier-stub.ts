import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Holds actual HTTP responses so a test can prove requests overlap, not just finish quickly. */
export async function llmBarrierStub() {
  const pending: ServerResponse[] = [];
  const requests: string[] = [];
  let released = false;
  const reply = (res: ServerResponse) => {
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [{ message: { content: 'Parallel real HTTP response' }, finish_reason: 'stop' }],
      }),
    );
  };
  const server = createServer((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      requests.push(Buffer.concat(chunks).toString('utf8'));
      if (released) reply(res);
      else pending.push(res);
    })().catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  const release = () => {
    released = true;
    for (const response of pending.splice(0)) reply(response);
  };
  return {
    url: `http://127.0.0.1:${address.port}/v1`,
    requests,
    release,
    async close() {
      release();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
