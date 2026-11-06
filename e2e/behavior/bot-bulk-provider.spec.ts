import { expect, test } from '@playwright/test';
import { botBulkPrompt, validateBotBulkCompletion } from '@opchub/shared';
import { z } from 'zod';
import { startBulkStub } from '../llm/bulk-stub';
import { bulkProviderFixture } from '../llm/bulk-provider-setup';

const responseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).length(1),
});
const body = (ordinal: number) => ({
  model: 'browser-bulk-model',
  messages: [
    {
      role: 'user',
      content: botBulkPrompt({
        topic: 'Thuế',
        typeName: 'Hỏi đáp',
        typeDescription: '',
        ordinal,
        retry: false,
        personas: ['p1', 'p2', 'p1'].map((id) => ({
          id,
          name: id,
          tone: '',
          bio: '',
          skills: '',
          groupIds: ['c1'],
          enabled: true,
        })),
      }),
    },
  ],
});
const headers = {
  'content-type': 'application/json',
  authorization: 'Bearer browser-bulk-test-key',
};

test('D-112 local bulk HTTP fixture accepts the actual shared prompt and produces distinct variants', async ({
  request,
}) => {
  const stub = await startBulkStub();
  try {
    const configured = bulkProviderFixture(stub.url).providers.find((p) => p.id === 'custom');
    expect(configured).toMatchObject({
      enabled: true,
      baseUrl: stub.url,
      model: 'browser-bulk-model',
    });
    const lines: string[] = [];
    for (const ordinal of [0, 1]) {
      const response = await request.post(`${stub.url}/chat/completions`, {
        headers: { ...headers, authorization: `Bearer ${configured?.key}` },
        data: { ...body(ordinal), model: configured?.model },
      });
      expect(response.status()).toBe(200);
      const payload = responseSchema.parse(await response.json());
      const content = payload.choices[0]?.message.content;
      if (!content) throw new Error('Missing provider content');
      lines.push(...validateBotBulkCompletion(JSON.parse(content), 3));
    }
    expect(new Set(lines).size).toBe(6);
    expect(stub.requests).toEqual([
      { topic: 'Thuế', variant: 1, turns: 3 },
      { topic: 'Thuế', variant: 2, turns: 3 },
    ]);
  } finally {
    await stub.close();
  }
});

test('D-112 local bulk HTTP fixture rejects missing credentials and malformed provider input', async ({
  request,
}) => {
  const stub = await startBulkStub();
  try {
    const unauthorized = await request.post(`${stub.url}/chat/completions`);
    expect(unauthorized.status()).toBe(401);
    const malformed = await request.post(`${stub.url}/chat/completions`, {
      headers,
      data: { model: 'wrong-model', messages: [] },
    });
    expect(malformed.status()).toBe(400);
    expect(stub.requests).toEqual([]);
  } finally {
    await stub.close();
  }
});
