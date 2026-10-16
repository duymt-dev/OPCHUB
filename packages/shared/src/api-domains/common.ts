import { z } from 'zod';

/** Khối dựng dùng chung cho DTO theo domain — api-conventions.md */

/** List cuộn vô hạn (chat, thông báo): `{ items, nextCursor }` */
export const cursorPageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

/** Query phân trang chuẩn `?page&size&q` — size mặc định truyền vào theo BR-12 */
export const pageQuerySchema = (defaultSize: number) =>
  z.object({
    page: z.coerce.number().int().min(1).catch(1),
    size: z.coerce.number().int().min(1).max(100).catch(defaultSize),
    q: z.string().trim().optional(),
  });

export const idListSchema = z.array(z.string().min(1)).min(1);

export const personRefSchema = z.object({
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
export type PersonRef = z.infer<typeof personRefSchema>;
