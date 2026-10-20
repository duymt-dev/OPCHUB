/** TIP-501/502: domain supplies context; only an adapter may contact an LLM. */
export interface LlmTurnContext {
  readonly topic: string;
  readonly persona: {
    readonly id: string;
    readonly name: string;
    readonly tone: string;
    readonly skills: string;
  };
  readonly history: readonly {
    readonly personaId: string | null;
    readonly body: string;
  }[];
}

export interface LlmProvider {
  readonly name: string;
  complete(prompt: string, opts?: { maxTokens?: number }): Promise<string>;
  generateTurn(context: LlmTurnContext): Promise<string>;
}
