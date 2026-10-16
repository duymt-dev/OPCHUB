import {
  chatMessagePageSchema,
  chatMessageSchema,
  chatOverviewSchema,
  chatRoomSchema,
  joinRequestSchema,
  joinResultSchema,
  reportSchema,
  roomFileSchema,
  roomMembersSchema,
  roomPinSchema,
} from '@opchub/shared/api-domains';
import type { CreateTopicRequest, ReportMessageRequest } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

/** REST của Chat nhóm (SRS §13). Gửi/cảm xúc/ghim đi qua transport — xem transport.ts */

const items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

export const chatKeys = {
  all: ['chat'] as const,
  overview: () => [...chatKeys.all, 'overview'] as const,
  rooms: (groupId: string) => [...chatKeys.all, 'rooms', groupId] as const,
  messages: (roomId: string, q: string) => [...chatKeys.all, 'messages', roomId, q] as const,
  roomMessages: (roomId: string) => [...chatKeys.all, 'messages', roomId] as const,
  members: (roomId: string) => [...chatKeys.all, 'members', roomId] as const,
  pins: (roomId: string) => [...chatKeys.all, 'pins', roomId] as const,
  files: (roomId: string) => [...chatKeys.all, 'files', roomId] as const,
  requests: (groupId: string) => [...chatKeys.all, 'requests', groupId] as const,
};

export const MESSAGE_PAGE = 50;

export const fetchOverview = () => api('/me/chat', { schema: chatOverviewSchema });

export const fetchRooms = (groupId: string) =>
  api(`/groups/${groupId}/rooms`, { schema: items(chatRoomSchema) }).then((r) => r.items);

export function fetchMessages(roomId: string, q: string, before: string | null) {
  const p = new URLSearchParams({ size: String(MESSAGE_PAGE) });
  if (q) p.set('q', q);
  if (before) p.set('before', before);
  return api(`/rooms/${roomId}/messages?${p.toString()}`, { schema: chatMessagePageSchema });
}

export const fetchMembers = (roomId: string) =>
  api(`/rooms/${roomId}/members`, { schema: roomMembersSchema });

export const fetchPins = (roomId: string) =>
  api(`/rooms/${roomId}/pins`, { schema: items(roomPinSchema) }).then((r) => r.items);

export const fetchFiles = (roomId: string) =>
  api(`/rooms/${roomId}/files`, { schema: items(roomFileSchema) }).then((r) => r.items);

export const fetchRequests = (groupId: string) =>
  api(`/groups/${groupId}/requests`, { schema: items(joinRequestSchema) }).then((r) => r.items);

export const decideRequest = (groupId: string, userId: string, decision: 'approve' | 'reject') =>
  api(`/groups/${groupId}/requests/${userId}/${decision}`, {
    method: 'POST',
    schema: joinResultSchema,
  });

export const createTopic = (groupId: string, body: CreateTopicRequest) =>
  api(`/groups/${groupId}/rooms`, { method: 'POST', body, schema: chatRoomSchema });

export const deleteTopic = (roomId: string) =>
  api(`/rooms/${roomId}`, { method: 'DELETE', schema: z.object({ id: z.string() }) });

export const markRead = (roomId: string) =>
  api(`/rooms/${roomId}/read`, { method: 'POST', schema: z.object({ id: z.string() }) });

export const reportMessage = (messageId: string, body: ReportMessageRequest) =>
  api(`/messages/${messageId}/report`, { method: 'POST', body, schema: reportSchema });

export const joinGroup = (groupId: string) =>
  api(`/groups/${groupId}/join`, { method: 'POST', body: {}, schema: joinResultSchema });

export { chatMessageSchema };
