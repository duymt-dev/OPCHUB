/** LLM cho bot (D-04, sau go-live, sau flag). Chỉ fake; Anthropic provider thêm khi bật bot thật. */
export interface LlmProvider {
  readonly name: string;
  complete(prompt: string, opts?: { maxTokens?: number }): Promise<string>;
}

/** Trả câu cố định có dấu vết prompt — đủ để test luồng bot mà không gọi mạng */
export class FakeLlmProvider implements LlmProvider {
  readonly name = 'fake';

  complete(prompt: string): Promise<string> {
    const topic = prompt.split('\n')[0]?.slice(0, 80) ?? '';
    return Promise.resolve(`Mình chia sẻ thêm về chủ đề: ${topic}`);
  }
}
