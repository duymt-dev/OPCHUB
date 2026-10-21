import { roomsFromStorageChange } from './room-changes';

/** Relay writes occur in a separate same-origin document, so the Portal parent receives storage. */
export function subscribeMockChatRooms(onChange: (roomIds: readonly string[]) => void): () => void {
  const receive = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return;
    const fixture = document.cookie.split('; ').includes('opchub-mock-affiliate-demo=1')
      ? 'affiliate'
      : 'base';
    const rooms = roomsFromStorageChange(event, location.origin, fixture);
    if (rooms.length) onChange(rooms);
  };
  window.addEventListener('storage', receive);
  return () => window.removeEventListener('storage', receive);
}
