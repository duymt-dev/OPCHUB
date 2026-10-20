import type { LlmProvider, LlmTurnContext } from './types';

export type { LlmProvider, LlmTurnContext } from './types';
export { LocalLlmProvider } from './local.provider';

/** Trả câu cố định có dấu vết prompt — đủ để test luồng bot mà không gọi mạng */
export class FakeLlmProvider implements LlmProvider {
  readonly name = 'fake';

  complete(prompt: string): Promise<string> {
    const topic = prompt.split('\n')[0]?.slice(0, 80) ?? '';
    return Promise.resolve(`Mình chia sẻ thêm về chủ đề: ${topic}`);
  }

  generateTurn(context: LlmTurnContext): Promise<string> {
    return this.complete(context.topic);
  }
}
