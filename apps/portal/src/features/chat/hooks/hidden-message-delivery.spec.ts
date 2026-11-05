import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { chatMessageSchema, type ChatMessagePage } from '@opchub/shared/api-domains';
import { chatKeys } from '../api';
import { upsertMessage } from './use-message-actions';

const hidden = (senderId: string | null = 'member') =>
  chatMessageSchema.parse({
    id: 'hidden-new',
    roomId: 'room-a',
    sender: { name: 'Member', avatarUrl: null },
    body: '',
    attachment: null,
    reactions: [],
    pinned: false,
    createdAt: '2026-10-21T05:00:00Z',
    hiddenAt: '2026-10-21T05:00:00Z',
    kind: 'text',
    senderId,
    senderRole: null,
    replyTo: null,
    reportedByMe: false,
    myReactions: [],
    clientMsgId: 'client-id',
  });

function fixture() {
  const qc = new QueryClient();
  const empty: InfiniteData<ChatMessagePage> = {
    pages: [{ items: [], nextCursor: null }],
    pageParams: [null],
  };
  qc.setQueryData(chatKeys.messages('room-a', ''), empty);
  qc.setQueryData(chatKeys.messages('room-a', 'search'), empty);
  const rows = (query = '') =>
    qc
      .getQueryData<InfiniteData<ChatMessagePage>>(chatKeys.messages('room-a', query))
      ?.pages.flatMap((p) => p.items);
  return { qc, rows };
}

describe('D-77 D-117 E2E-05 first delivery of screened member messages', () => {
  it('shows a new hidden member placeholder without adding it to search', () => {
    const { qc, rows } = fixture();
    upsertMessage(qc, hidden(), true);
    expect(rows()?.map((m) => [m.id, m.body, m.hiddenAt])).toEqual([
      ['hidden-new', '', '2026-10-21T05:00:00Z'],
    ]);
    expect(rows('search')).toEqual([]);
    qc.clear();
  });
  it('deduplicates the send acknowledgement and message.new delivery', () => {
    const { qc, rows } = fixture();
    upsertMessage(qc, hidden(), true);
    upsertMessage(qc, hidden(), true);
    expect(rows()).toHaveLength(1);
    qc.clear();
  });
  it('does not insert an unseen hidden member update/replay', () => {
    const { qc, rows } = fixture();
    upsertMessage(qc, hidden());
    expect(rows()).toEqual([]);
    qc.clear();
  });
  it('does not insert a new hidden bot even in the ordinary room feed', () => {
    const { qc, rows } = fixture();
    upsertMessage(qc, hidden(null), true);
    expect(rows()).toEqual([]);
    qc.clear();
  });
  it('does not create a room cache when no room query is mounted', () => {
    const qc = new QueryClient();
    upsertMessage(qc, hidden(), true);
    expect(qc.getQueryData(chatKeys.messages('room-a', ''))).toBeUndefined();
    qc.clear();
  });
});
