import { describe, expect, it } from 'vitest';
import {
  BUILTIN_BOT_CONVERSATION_TYPES,
  botConversationTypeInputSchema,
  botConversationTypeSchema,
  botConversationTypesPageSchema,
  botConversationTypesQuerySchema,
} from './bot-conversation-types';

describe('D-112 conversation type contract', () => {
  it('exposes four distinct immutable built-ins with behavior definitions', () => {
    expect(BUILTIN_BOT_CONVERSATION_TYPES.map((type) => type.name)).toEqual([
      'Hỏi đáp',
      'Thảo luận',
      'Chia sẻ kinh nghiệm',
      'Giới thiệu sự kiện / dự án',
    ]);
    expect(new Set(BUILTIN_BOT_CONVERSATION_TYPES.map((type) => type.id)).size).toBe(4);
    for (const type of BUILTIN_BOT_CONVERSATION_TYPES) {
      expect(botConversationTypeSchema.parse(type)).toEqual(type);
      expect(type.custom).toBe(false);
      expect(type.description.length).toBeGreaterThan(20);
    }
  });
  it('trims custom text, permits an omitted/empty description and matches the script type bound', () => {
    expect(botConversationTypeInputSchema.parse({ name: '  Phỏng vấn  ' })).toEqual({
      name: 'Phỏng vấn',
      description: '',
    });
    expect(
      botConversationTypeInputSchema.parse({ name: 'a'.repeat(60), description: ' x ' })
        .description,
    ).toBe('x');
  });
  it.each([
    { name: '' },
    { name: '   ' },
    { name: 'a'.repeat(61) },
    { name: 'Test', description: 'a'.repeat(2001) },
    { name: 'Test', custom: false },
    { name: 'Test', id: 'builtin-qa' },
  ])('rejects malformed or privileged input %j', (input) => {
    expect(botConversationTypeInputSchema.safeParse(input).success).toBe(false);
  });
  it('uses a bounded cursor page without imposing a total catalog limit', () => {
    expect(botConversationTypesQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(botConversationTypesQuerySchema.parse({ limit: '100' })).toEqual({ limit: 100 });
    expect(
      botConversationTypesPageSchema.parse({
        builtins: BUILTIN_BOT_CONVERSATION_TYPES,
        items: [],
        nextCursor: null,
      }).items,
    ).toEqual([]);
  });
  it.each([{ limit: 0 }, { limit: 101 }, { after: 'invalid' }, { offset: 100 }])(
    'rejects invalid page %j',
    (input) => {
      expect(botConversationTypesQuerySchema.safeParse(input).success).toBe(false);
    },
  );
});
