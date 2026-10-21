import { beforeEach, describe, expect, it } from 'vitest';
import { captureMockAffiliateSnapshot } from '../affiliate-persistence/snapshot';
import { AFFILIATE_BRIDGE_CHANNEL } from '../affiliate-persistence/protocol';
import { resetMockDb } from '../store';
import { serializeMockLeaseState } from './lease-storage';
import { captureCommunitySnapshot } from './snapshot';
import { changedChatRooms, roomsFromStorageChange, type RoomStorageChange } from './room-changes';
import type { CommunitySnapshot } from './schema';

const wire = (community: CommunitySnapshot) =>
  serializeMockLeaseState(captureMockAffiliateSnapshot(), community, { snapshot: null });
const first = (snapshot: CommunitySnapshot) => {
  const room = snapshot.chat.messages.find(([id]) => id === 'c1-general');
  if (!room?.[1][0]) throw new Error('Missing actual chat fixture');
  return { room, message: room[1][0] };
};
const eventOf = (before: CommunitySnapshot, after: CommunitySnapshot): RoomStorageChange => ({
  key: `${AFFILIATE_BRIDGE_CHANNEL}:base`,
  url: 'http://localhost:3240/mock-affiliate-state',
  oldValue: wire(before),
  newValue: wire(after),
});
beforeEach(() => resetMockDb());

describe('REQ-060 REQ-141 committed mock room invalidation', () => {
  it('reports a new publication only for its room, without exposing its body/persona metadata', () => {
    const before = captureCommunitySnapshot();
    const after = captureCommunitySnapshot();
    const { room, message } = first(after);
    room[1].push({ ...message, id: 'new-publication', body: 'private notification input' });
    expect(changedChatRooms(before, after)).toEqual(['c1-general']);
    expect(roomsFromStorageChange(eventOf(before, after), 'http://localhost:3240', 'base')).toEqual(
      ['c1-general'],
    );
  });
  it('invalidates hidden/changed bodies and removed room contents', () => {
    const before = captureCommunitySnapshot();
    const after = captureCommunitySnapshot();
    first(after).message.hiddenAt = '2026-10-21T05:00:00Z';
    expect(changedChatRooms(before, after)).toEqual(['c1-general']);
    after.chat.messages = after.chat.messages.filter(([id]) => id !== 'c1-general');
    expect(changedChatRooms(before, after)).toEqual(['c1-general']);
  });
  it('invalidates pins without requiring a new message', () => {
    const before = captureCommunitySnapshot();
    const after = captureCommunitySnapshot();
    after.chat.pins = after.chat.pins.filter(([id]) => id !== 'c1-general');
    after.chat.pins.push(['c1-general', ['changed-pin']]);
    expect(changedChatRooms(before, after)).toEqual(['c1-general']);
  });
  it('does not refetch history for unread, activity, sequence or equal serialization changes', () => {
    const before = captureCommunitySnapshot();
    const after = captureCommunitySnapshot();
    after.sequence += 1;
    after.chat.unread = [];
    after.bot.state.activity = [];
    expect(changedChatRooms(before, after)).toEqual([]);
    expect(roomsFromStorageChange(eventOf(before, after), 'http://localhost:3240', 'base')).toEqual(
      [],
    );
  });
  it.each([
    { key: `${AFFILIATE_BRIDGE_CHANNEL}:affiliate` },
    { key: 'other-ledger' },
    { url: 'http://localhost:3242/mock-affiliate-state' },
    { url: 'http://evil.invalid/mock-affiliate-state' },
    { url: 'http://localhost:3240/other-page' },
    { url: 'http://localhost:3240/mock-affiliate-state?spoof=1' },
    { newValue: '{broken' },
    { oldValue: '{broken' },
    { newValue: null },
  ])('ignores untrusted, corrupted or unrelated events: %j', (patch) => {
    const before = captureCommunitySnapshot();
    const after = captureCommunitySnapshot();
    first(after).message.body = 'updated';
    expect(
      roomsFromStorageChange(
        { ...eventOf(before, after), ...patch },
        'http://localhost:3240',
        'base',
      ),
    ).toEqual([]);
  });
});
