import {
  BUILTIN_BOT_CONVERSATION_TYPES,
  botConversationTypeInputSchema,
  type BotConversationType,
  type BotConversationTypeInput,
  type BotConversationTypesQuery,
} from '../../api-domains/bot-conversation-types';
import { botState } from './bot-state';
import { conflict, notFound, ok, type MockResult } from './util';

export function listMockConversationTypes(query: BotConversationTypesQuery) {
  const candidates = botState()
    .conversationTypes.filter((type) => !query.after || type.id > query.after)
    .sort((a, b) => a.id.localeCompare(b.id));
  const items = candidates.slice(0, query.limit);
  return {
    builtins: structuredClone(BUILTIN_BOT_CONVERSATION_TYPES),
    items: structuredClone(items),
    nextCursor: candidates.length > query.limit ? (items.at(-1)?.id ?? null) : null,
  };
}

export function findMockConversationType(id: string): MockResult<BotConversationType> {
  const type =
    BUILTIN_BOT_CONVERSATION_TYPES.find((row) => row.id === id) ??
    botState().conversationTypes.find((row) => row.id === id);
  return type ? ok(structuredClone(type)) : notFound('Không tìm thấy loại hội thoại');
}

export function createMockConversationType(
  input: BotConversationTypeInput,
): MockResult<BotConversationType> {
  const clean = botConversationTypeInputSchema.parse(input);
  const types = botState().conversationTypes;
  if (
    [...BUILTIN_BOT_CONVERSATION_TYPES, ...types].some(
      (type) => type.name.toLowerCase() === clean.name.toLowerCase(),
    )
  )
    return conflict('Loại hội thoại đã tồn tại');
  const type = { ...clean, id: crypto.randomUUID(), custom: true };
  types.push(type);
  return ok(structuredClone(type));
}

export function removeMockConversationType(id: string): MockResult<{ id: string }> {
  if (BUILTIN_BOT_CONVERSATION_TYPES.some((type) => type.id === id))
    return conflict('Không thể xoá loại hội thoại mặc định');
  const state = botState();
  if (!state.conversationTypes.some((type) => type.id === id))
    return notFound('Không tìm thấy loại hội thoại');
  state.conversationTypes = state.conversationTypes.filter((type) => type.id !== id);
  return ok({ id });
}
