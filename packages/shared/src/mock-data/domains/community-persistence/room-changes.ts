import { AFFILIATE_BRIDGE_CHANNEL } from '../affiliate-persistence/protocol';
import { readMockLeaseState } from './lease-storage';
import type { CommunitySnapshot } from './schema';

/** Only visible room data participates; unread/worker/financial reads must not refetch history. */
function roomVersions(snapshot: CommunitySnapshot | undefined): Map<string, string> {
  if (!snapshot) return new Map();
  const ext = new Map(snapshot.chat.ext);
  const pins = new Map(snapshot.chat.pins);
  return new Map(
    snapshot.chat.messages.map(([roomId, messages]) => [
      roomId,
      JSON.stringify({
        messages: messages.map((row) => [row, ext.get(row.id)]),
        pins: pins.get(roomId) ?? [],
      }),
    ]),
  );
}

export function changedChatRooms(
  before: CommunitySnapshot | undefined,
  after: CommunitySnapshot | undefined,
): string[] {
  const previous = roomVersions(before);
  const current = roomVersions(after);
  return [...new Set([...previous.keys(), ...current.keys()])]
    .filter((roomId) => previous.get(roomId) !== current.get(roomId))
    .sort();
}

export interface RoomStorageChange {
  key: string | null;
  url: string;
  oldValue: string | null;
  newValue: string | null;
}

/** A storage event is an invalidation hint, never a trusted public Chat DTO. */
export function roomsFromStorageChange(
  event: RoomStorageChange,
  origin: string,
  fixture: 'base' | 'affiliate',
): string[] {
  if (event.key !== `${AFFILIATE_BRIDGE_CHANNEL}:${fixture}` || event.newValue === null) return [];
  try {
    const source = new URL(event.url);
    if (
      source.origin !== origin ||
      source.pathname !== '/mock-affiliate-state' ||
      source.search ||
      source.hash
    )
      return [];
    const before = readMockLeaseState(event.oldValue);
    const after = readMockLeaseState(event.newValue);
    return changedChatRooms(before.communitySnapshot, after.communitySnapshot);
  } catch {
    // Bad notifications cannot clear caches or overwrite state. The next real read still fails closed.
    return [];
  }
}
