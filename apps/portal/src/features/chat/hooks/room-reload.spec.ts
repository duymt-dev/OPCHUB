import { QueryClient, QueryObserver, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { chatMessageSchema, type ChatMessagePage } from '@opchub/shared/api-domains';
import { chatKeys } from '../api';
import { upsertMessage } from './use-message-actions';
import { reloadChatRoom, reloadMockChatRoom } from './use-room-reload';
import { activateMockRoomClient } from './use-mock-room-reload';

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
  it('A13 reactivates a restarted MSW client before reading and releases listeners on unmount', async () => {
    const serviceWorker = new EventTarget();
    const postMessage = vi.fn();
    const controller = { postMessage } as unknown as ServiceWorker;
    Object.assign(serviceWorker, { controller });
    vi.stubGlobal('navigator', { serviceWorker });
    const lifetime = new AbortController();
    try {
      let ready = false;
      const activation = activateMockRoomClient(lifetime.signal).then(() => {
        ready = true;
      });
      expect(postMessage).toHaveBeenCalledExactlyOnceWith('MOCK_ACTIVATE');
      expect(ready).toBe(false);
      serviceWorker.dispatchEvent(
        new MessageEvent('message', {
          source: controller,
          data: { type: 'MOCKING_ENABLED' },
        }),
      );
      await activation;
      expect(ready).toBe(true);
      const pending = activateMockRoomClient(lifetime.signal);
      lifetime.abort();
      await pending;
    } finally {
      lifetime.abort();
      vi.unstubAllGlobals();
    }
  });
  it('A13 stale empty reload does not replace newer list', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const key = chatKeys.messages('room-a', '');
    const latest = pages();
    qc.setQueryData(key, latest);
    let completeOld: (value: InfiniteData<ChatMessagePage>) => void = () => {
      throw new Error('Old fetch not started');
    };
    let calls = 0;
    const observer = new QueryObserver(qc, {
      queryKey: key,
      queryFn: () => {
        calls += 1;
        if (calls > 1) return Promise.resolve(latest);
        return new Promise<InfiniteData<ChatMessagePage>>((resolve) => {
          completeOld = resolve;
        });
      },
    });
    const unsubscribe = observer.subscribe(() => undefined);
    try {
      const old = qc.refetchQueries({ queryKey: key });
      await reloadMockChatRoom(qc, 'room-a');
      completeOld({ pages: [{ items: [], nextCursor: null }], pageParams: [null] });
      await old;
      expect(calls).toBe(2);
      expect(qc.getQueryData(key)).toEqual(latest);
    } finally {
      unsubscribe();
      qc.clear();
    }
  });
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
