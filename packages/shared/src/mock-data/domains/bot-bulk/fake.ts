export interface MockBulkPrompt {
  batchId: string;
  topic: string;
  ordinal: number;
  turns: number;
  attempt: number;
}
/** Explicit MSW-only provider substitute, never imported by native production execution. */
export function fakeMockBulkCompletion(prompt: MockBulkPrompt): unknown {
  return {
    lines: Array.from(
      { length: prompt.turns },
      (_, index) =>
        `Nội dung thử nghiệm ${prompt.batchId.slice(0, 8)} · ${prompt.topic} · hội thoại ${prompt.ordinal + 1}, lượt ${index + 1}.`,
    ),
  };
}
