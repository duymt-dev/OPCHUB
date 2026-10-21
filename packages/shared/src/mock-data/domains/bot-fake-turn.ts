/** Same deterministic output as FakeLlmProvider; mock lanes never contact a provider. */
export const mockFakeBotTurn = (topic: string): string =>
  `Mình chia sẻ thêm về chủ đề: ${topic.split('\n')[0]?.slice(0, 80) ?? ''}`;
