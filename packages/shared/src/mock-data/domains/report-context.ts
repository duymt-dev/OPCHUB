import type { Message } from '../../api-domains';
import { chatState } from './chat-store';
import { mockDb } from './store';
import type { MockDb } from './store-types';

interface Source {
  userId: string | null;
  messageId: string;
  roomId: string;
}
const contexts = new WeakMap<MockDb, Map<string, Source>>();
function sources() {
  const db = mockDb();
  let value = contexts.get(db);
  if (!value) {
    value = new Map();
    contexts.set(db, value);
  }
  return value;
}

/** Capture runtime FK identity, not a mutable display name, before source removal. */
export function rememberMockReportSource(reportId: string, message: Message) {
  sources().set(reportId, {
    userId: message.isSimulated ? null : (chatState().ext.get(message.id)?.senderId ?? null),
    roomId: message.roomId,
    messageId: message.id,
  });
}
export const mockReportSource = (reportId: string) => sources().get(reportId);
export const mockReportSources = () => sources();
