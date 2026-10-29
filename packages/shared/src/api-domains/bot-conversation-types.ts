import { z } from 'zod';

export const botConversationTypeInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(2000).default(''),
});
export const botConversationTypeSchema = botConversationTypeInputSchema.extend({
  id: z.string().min(1),
  custom: z.boolean(),
});
export type BotConversationType = z.output<typeof botConversationTypeSchema>;
export type BotConversationTypeInput = z.output<typeof botConversationTypeInputSchema>;
export const botConversationTypeParamsSchema = z.strictObject({ id: z.string().min(1).max(100) });

/** D-112: definitions describe behavior, not canned dialogue or a generation fallback. */
export const BUILTIN_BOT_CONVERSATION_TYPES = [
  {
    id: 'builtin-qa',
    name: 'Hỏi đáp',
    custom: false,
    description:
      'Một persona đặt câu hỏi cụ thể; các persona khác trả lời bằng kinh nghiệm thực tế; người hỏi cảm ơn và khép lại.',
  },
  {
    id: 'builtin-discussion',
    name: 'Thảo luận',
    custom: false,
    description:
      'Mở một vấn đề có nhiều góc nhìn; các persona nêu quan điểm khác nhau, có đồng ý và phản biện.',
  },
  {
    id: 'builtin-experience',
    name: 'Chia sẻ kinh nghiệm',
    custom: false,
    description:
      'Một persona kể câu chuyện hoặc bài học đã trải qua; người khác hỏi thêm và bổ sung.',
  },
  {
    id: 'builtin-announcement',
    name: 'Giới thiệu sự kiện / dự án',
    custom: false,
    description:
      'Thông báo sự kiện, workshop hoặc dự án; các persona hỏi chi tiết và bày tỏ muốn tham gia.',
  },
] as const satisfies readonly BotConversationType[];

export const botConversationTypesQuerySchema = z.strictObject({
  after: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type BotConversationTypesQuery = z.output<typeof botConversationTypesQuerySchema>;
export const botConversationTypesPageSchema = z.strictObject({
  builtins: z.array(botConversationTypeSchema).length(4),
  items: z.array(botConversationTypeSchema).max(100),
  nextCursor: z.uuid().nullable(),
});
