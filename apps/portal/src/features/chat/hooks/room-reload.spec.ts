import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { chatMessageSchema, type ChatMessagePage } from '@opchub/shared/api-domains';
import { chatKeys } from '../api';
import { upsertMessage } from './use-message-actions';
import { reloadChatRoom } from './use-room-reload';

const message = (id: string, hiddenAt?: string) =>
  chatMessageSchema.parse({
    id,
    roomId: 'room-a',
    sender: { name: 'Member', avatarUrl: null },
    body: hiddenAt ? '' : id,
    attachment: null,
    reactions: [],
    pinned: false,
    createdAt: '2026-10-21T05:00:00Z',
    kind: 'text',
    senderId: null,
    senderRole: null,
    replyTo: null,
    reportedByMe: false,
    myReactions: [],
    clientMsgId: null,
    ...(hiddenAt ? { hiddenAt } : {}),
  });
const pages = (): InfiniteData<ChatMessagePage> => ({
  pages: [{ items: [message('bot'), message('human')], nextCursor: null }],
  pageParams: [null],
});

describe('REQ-141 hidden message cache and room reload', () => {
  it('REQ-141 hidden updates remove the row from every search/page variant without removing humans', () => {
    const qc = new QueryClient();
    qc.setQueryData(chatKeys.messages('room-a', ''), pages());
    qc.setQueryData(chatKeys.messages('room-a', 'search'), pages());
    upsertMessage(qc, message('bot', '2026-10-21T05:01:00Z'));
    for (const [, data] of qc.getQueriesData<InfiniteData<ChatMessagePage>>({
      queryKey: chatKeys.roomMessages('room-a'),
    })) {
      expect(data?.pages.flatMap((p) => p.items.map((m) => m.id))).toEqual(['human']);
    }
    qc.clear();
  });
  it('V4-612 hidden member message keeps its row in the room but leaves search results', () => {
    const qc = new QueryClient();
    qc.setQueryData(chatKeys.messages('room-a', ''), pages());
    qc.setQueryData(chatKeys.messages('room-a', 'search'), pages());
    const hidden = { ...message('human', '2026-10-21T05:01:00Z'), senderId: 'u-1' };
    upsertMessage(qc, hidden);
    const ids = (q: string) =>
      qc
        .getQueryData<InfiniteData<ChatMessagePage>>(chatKeys.messages('room-a', q))
        ?.pages.flatMap((p) => p.items);
    expect(ids('')?.map((m) => [m.id, m.hiddenAt ?? null, m.body])).toEqual([
      ['bot', null, 'bot'],
      ['human', '2026-10-21T05:01:00Z', ''],
    ]);
    expect(ids('search')?.map((m) => m.id)).toEqual(['bot']);
    qc.clear();
  });
  it('REQ-141 replayed hidden updates never insert an unseen hidden row', () => {
    const qc = new QueryClient();
    qc.setQueryData(chatKeys.messages('room-a', ''), pages());
    upsertMessage(qc, message('already-absent', '2026-10-21T05:01:00Z'));
    expect(qc.getQueryData(chatKeys.messages('room-a', ''))).toEqual(pages());
    qc.clear();
  });
  it('REQ-141 bulk room reload drops stale messages/pins/files and invalidates metadata without clearing another room', async () => {
    const qc = new QueryClient();
    qc.setQueryData(chatKeys.messages('room-a', ''), pages());
    qc.setQueryData(chatKeys.pins('room-a'), ['old pin']);
    qc.setQueryData(chatKeys.groupFiles('group-a', 'all', ''), ['old file']);
    qc.setQueryData(chatKeys.rooms('group-a'), ['old preview']);
    qc.setQueryData(chatKeys.overview(), ['old unread']);
    qc.setQueryData(chatKeys.messages('room-b', ''), ['other room']);
    await reloadChatRoom(qc, 'room-a');
    expect(qc.getQueryData(chatKeys.messages('room-a', ''))).toBeUndefined();
    expect(qc.getQueryData(chatKeys.pins('room-a'))).toBeUndefined();
    expect(qc.getQueryData(chatKeys.groupFiles('group-a', 'all', ''))).toBeUndefined();
    expect(qc.getQueryState(chatKeys.rooms('group-a'))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(chatKeys.overview())?.isInvalidated).toBe(true);
    expect(qc.getQueryData(chatKeys.messages('room-b', ''))).toEqual(['other room']);
    qc.clear();
  });
});
