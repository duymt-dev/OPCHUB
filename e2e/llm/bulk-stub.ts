import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const requestSchema = z.object({
  model: z.literal('browser-bulk-model'),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
});
const promptSchema = z.object({
  topic: z.string(),
  variant: z.number().int().positive(),
  speakers: z
    .array(z.object({ name: z.string() }))
    .min(2)
    .max(8),
});

/** Test-only HTTP provider. Production still uses the encrypted Admin configuration. */
export async function startBulkStub() {
  const requests: { topic: string; variant: number; turns: number }[] = [];
  const nonce = randomUUID();
  const server = createServer((request, response) => {
    response.setHeader('connection', 'close');
    void (async () => {
      if (request.url !== '/v1/chat/completions' || request.method !== 'POST') {
        response.writeHead(404).end();
        return;
      }
      if (request.headers.authorization !== 'Bearer browser-bulk-test-key') {
        response.writeHead(401).end();
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of request) if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      const body = requestSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      const prompt = body.messages.findLast((message) => message.role === 'user')?.content;
      if (!prompt) throw new Error('Missing bulk prompt');
      const input = promptSchema.parse(JSON.parse(prompt.split('\n').at(-1) ?? ''));
      requests.push({ topic: input.topic, variant: input.variant, turns: input.speakers.length });
      const content = JSON.stringify({
        lines: input.speakers.map(
          (_, index) =>
            `HTTP kiểm thử ${nonce}: ${input.topic}, bản ${input.variant}, lượt ${index + 1}.`,
        ),
      });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }));
    })().catch(() => response.writeHead(400).end());
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing local provider port');
  return {
    url: `http://127.0.0.1:${address.port}/v1`,
    requests,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
