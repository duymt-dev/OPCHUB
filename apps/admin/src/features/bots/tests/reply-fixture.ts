import type { BotReplyOverview } from '@opchub/shared/api-domains';

export function replyFixture(): BotReplyOverview {
  return {
    settings: { autoEnabled: false, sampleSize: 50, delaySeconds: 5 },
    lastScanAt: null,
    pendingTotal: 3,
    groupCount: 2,
    run: null,
    history: [],
    groups: [
      {
        groupId: 'g1',
        groupName: 'Nhóm không persona',
        roomId: 'r1',
        pending: 2,
        personaCount: 0,
        preview: [],
      },
      {
        groupId: 'g2',
        groupName: 'Nhóm hợp lệ',
        roomId: 'r2',
        pending: 1,
        personaCount: 2,
        preview: [
          {
            id: 'm1',
            senderName: 'Nguyễn An',
            body: 'Xin chia sẻ kinh nghiệm',
            createdAt: '2026-10-28T02:00:00.000Z',
          },
        ],
      },
    ],
  };
}
