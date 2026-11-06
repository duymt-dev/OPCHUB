import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalLlmProvider } from './local.provider';

const config = { baseUrl: 'https://llm.example.test/v1', apiKey: 'unit-key', model: 'unit-model' };
const completed = (content = 'Nội dung trả lời thật') =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason: 'stop' }],
    }),
  );

afterEach(() => vi.unstubAllGlobals());

describe('REQ-208 REQ-411 real LLM protocol adapter (mock HTTP)', () => {
  it('REQ-208 sends the configured model/auth and bounded nonstreaming completion', async () => {
    const transport = vi.fn<typeof fetch>(() => Promise.resolve(completed()));
    vi.stubGlobal('fetch', transport);
    const provider = new LocalLlmProvider(config);
    await expect(provider.complete('Chủ đề', { maxTokens: 1000 })).resolves.toBe(
      'Nội dung trả lời thật',
    );
    const [url, init] = transport.mock.calls[0] ?? [];
    expect(url).toBe('https://llm.example.test/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(init?.redirect).toBe('error');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.headers).toEqual({
      'content-type': 'application/json',
      authorization: 'Bearer unit-key',
    });
    expect(init?.body).toBe(
      JSON.stringify({
        model: 'unit-model',
        messages: [{ role: 'user', content: 'Chủ đề' }],
        stream: false,
        max_tokens: 128,
      }),
    );
  });

  it('REQ-411 forwards actual persona/topic/history rather than returning a canned response', async () => {
    const transport = vi.fn<typeof fetch>(() => Promise.resolve(completed('Phản hồi từ endpoint')));
    vi.stubGlobal('fetch', transport);
    const turn = {
      topic: 'Làm sao tổ chức công việc?',
      persona: { id: 'p1', name: 'Hà', tone: 'Thân thiện', skills: 'Quản trị' },
      history: [{ personaId: null, body: 'Chia sẻ giúp mình' }],
    };
    await expect(new LocalLlmProvider(config).generateTurn(turn)).resolves.toBe(
      'Phản hồi từ endpoint',
    );
    const body = transport.mock.calls[0]?.[1]?.body;
    if (typeof body !== 'string') throw new Error('Missing serialized request body');
    expect(body).toContain(JSON.stringify(JSON.stringify(turn)).slice(1, -1));
  });

  it('REQ-208 request budget counts failed calls too and prevents further network requests', async () => {
    const transport = vi.fn<typeof fetch>(() =>
      Promise.reject(new Error('raw unit-key network error')),
    );
    vi.stubGlobal('fetch', transport);
    const provider = new LocalLlmProvider({ ...config, maxRequests: 1 });
    await expect(provider.complete('x')).rejects.toMatchObject({ retryable: true });
    const blocked = provider.complete('x');
    await expect(blocked).rejects.toMatchObject({ retryable: false });
    await expect(blocked).rejects.toThrow(/budget exhausted/);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 429, 500, 503])(
    'REQ-208 HTTP %s errors are generic and classified without implicit retry',
    async (status) => {
      const transport = vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response('unit-key confidential provider error', { status })),
      );
      vi.stubGlobal('fetch', transport);
      await expect(new LocalLlmProvider(config).complete('x')).rejects.toMatchObject({
        provider: 'local-llm',
        retryable: status === 429 || status >= 500,
        message: `[local-llm] LLM HTTP ${status}`,
      });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );

  it('REQ-208 network errors do not expose raw credential-bearing causes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('unit-key'))),
    );
    const error: unknown = await new LocalLlmProvider(config)
      .complete('x')
      .catch((error: unknown) => error);
    expect(error).toMatchObject({
      message: '[local-llm] LLM request failed or timed out',
    });
    expect(error).not.toHaveProperty('cause');
    expect(String(error)).not.toContain('unit-key');
  });

  it.each([
    'not-json',
    '{}',
    JSON.stringify({ choices: [] }),
    JSON.stringify({ choices: [{ message: { content: ' ' }, finish_reason: 'stop' }] }),
    JSON.stringify({ choices: [{ message: { content: 'partial' }, finish_reason: 'length' }] }),
  ])(
    'REQ-208 malformed, empty or truncated completion is not a successful chat message (%s)',
    async (body) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(new Response(body))),
      );
      await expect(new LocalLlmProvider(config).complete('x')).rejects.toMatchObject({
        retryable: false,
      });
    },
  );

  it.each([
    'http://remote.example/v1',
    'https://user:credential@example.test/v1',
    'https://example.test/v1?key=credential',
    'https://example.test/v1#secret',
  ])('REQ-208 rejects unsafe credential URL configuration (%s)', (baseUrl) => {
    expect(() => new LocalLlmProvider({ ...config, baseUrl })).toThrow(
      '[local-llm] Invalid LLM configuration',
    );
  });

  it('REQ-208 explicitly supports a loopback HTTP server without allowing insecure remote HTTP', () => {
    expect(new LocalLlmProvider({ ...config, baseUrl: 'http://127.0.0.1:9090/v1' }).name).toBe(
      'local-llm',
    );
  });

  it('REQ-208 invalid token budget is rejected before a request is sent', async () => {
    const transport = vi.fn();
    vi.stubGlobal('fetch', transport);
    await expect(
      new LocalLlmProvider(config).complete('x', { maxTokens: -1 }),
    ).rejects.toMatchObject({ retryable: false });
    expect(transport).not.toHaveBeenCalled();
  });

  it('REQ-208 oversized input is rejected before spending a request', async () => {
    const transport = vi.fn();
    vi.stubGlobal('fetch', transport);
    await expect(new LocalLlmProvider(config).complete('x'.repeat(64_001))).rejects.toMatchObject({
      retryable: false,
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('REQ-208 oversized response is rejected without echoing its contents', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('x'.repeat(64_001)))),
    );
    await expect(new LocalLlmProvider(config).complete('x')).rejects.toMatchObject({
      retryable: false,
      message: '[local-llm] Oversized LLM response',
    });
  });

  it('REQ-208 response stream failure remains retryable without leaking its cause', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              start(controller) {
                controller.error(new Error('unit-key'));
              },
            }),
          ),
        ),
      ),
    );
    await expect(new LocalLlmProvider(config).complete('x')).rejects.toMatchObject({
      retryable: true,
      message: '[local-llm] Invalid or unreadable LLM response body',
    });
  });
  it('REQ-628 sends temperature, transforms every message and reports validated usage/latency', async () => {
    const transport = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 1000, completion_tokens: 500 },
          }),
        ),
      ),
    );
    vi.stubGlobal('fetch', transport);
    const usage = vi.fn();
    const provider = new LocalLlmProvider(
      { ...config, temperature: 0.7 },
      { transform: (text) => text.replaceAll('secret', 'masked'), onUsage: usage },
    );
    await provider.generateTurn({
      topic: 'secret',
      persona: { id: 'ps', name: 'secret', tone: '', skills: '' },
      history: [{ personaId: null, body: 'secret' }],
    });
    const body = transport.mock.calls[0]?.[1]?.body;
    expect(typeof body).toBe('string');
    expect(body).not.toContain('secret');
    expect(body).toContain('masked');
    expect(body).toContain('"temperature":0.7');
    expect(usage.mock.calls[0]?.[0]).toEqual({ promptTokens: 1000, completionTokens: 500 });
    expect(usage.mock.calls[0]?.[1]).toBeGreaterThanOrEqual(0);
  });
  it('REQ-628429 is retryable but401 is not', async () => {
    for (const status of [429, 401]) {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(() => Promise.resolve(new Response('{}', { status }))),
      );
      await expect(new LocalLlmProvider(config).complete('x')).rejects.toMatchObject({
        retryable: status === 429,
      });
    }
  });
});
