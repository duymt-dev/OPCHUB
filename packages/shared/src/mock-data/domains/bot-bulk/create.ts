import { botBulkCreateSchema, type BotBulkCreate } from '../../../api-domains/bot-bulk';
import { botState } from '../bot-state';
import { findMockConversationType } from '../bot-conversation-types';
import { conflict, ok, type MockResult } from '../util';
import { mockBulkGroupsExist, mockBulkPersonas } from './state';

export function createMockBulk(actorId: string, input: BotBulkCreate, now = Date.now()) {
  const clean = botBulkCreateSchema.parse(input);
  const previous = botState().bulk.find(
    (r) => r.actorId === actorId && r.requestId === clean.requestId,
  );
  if (previous) return ok(structuredClone(previous.value));
  if (!mockBulkGroupsExist(clean.groupIds)) return invalidGroups();
  if (mockBulkPersonas(clean.groupIds).length < 2)
    return conflict('Cần ít nhất 2 persona đang bật');
  const type = findMockConversationType(clean.typeId);
  if (!type.ok) return type;
  const at = new Date(now).toISOString();
  const value = {
    id: crypto.randomUUID(),
    topics: clean.topics,
    typeName: type.data.name,
    typeDescription: type.data.description,
    perTopic: clean.perTopic,
    turns: clean.turns,
    delayMinutes: clean.delayMinutes,
    groupIds: clean.groupIds,
    status: 'running' as const,
    total: clean.topics.length * clean.perTopic,
    cursor: 0,
    error: null,
    selectedCount: 0,
    savedCount: 0,
    createdAt: at,
    updatedAt: at,
  };
  botState().bulk.push({
    value,
    actorId,
    requestId: clean.requestId,
    items: [],
    attempts: 0,
    nextAt: now,
  });
  return ok(structuredClone(value));
}
function invalidGroups(): MockResult<never> {
  return {
    ok: false,
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Nhóm đích không hợp lệ',
    fields: [{ path: 'groupIds', message: 'Chọn các nhóm còn hoạt động' }],
  };
}
