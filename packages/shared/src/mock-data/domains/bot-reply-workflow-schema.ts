import { z } from 'zod';
import {
  botReplyControlSchema,
  botReplyHistorySchema,
  botReplyRunSchema,
  botReplySettingsSchema,
} from '../../api-domains/bot-replies';

export const mockReplyRunSchema = z
  .strictObject({
    value: botReplyRunSchema,
    roomId: z.string().min(1),
    messageIds: z.array(z.string().min(1)).min(1).max(200),
    delaySeconds: botReplySettingsSchema.shape.delaySeconds,
    nextAt: z.number().nullable(),
    activeThreadId: z.string().nullable(),
  })
  .superRefine((run, ctx) => {
    if (new Set(run.messageIds).size !== run.messageIds.length)
      ctx.addIssue({
        code: 'custom',
        path: ['messageIds'],
        message: 'Lượt trả lời chứa tin trùng',
      });
    if (run.value.status === 'running' && (run.nextAt === null) === (run.activeThreadId === null))
      ctx.addIssue({
        code: 'custom',
        path: ['nextAt'],
        message: 'Lượt đang chạy phải có đúng một việc chờ',
      });
    if (run.value.total !== run.messageIds.length)
      ctx.addIssue({
        code: 'custom',
        path: ['messageIds'],
        message: 'Tổng số tin không khớp lượt trả lời',
      });
    if (run.value.status === 'done' && run.value.processed !== run.value.total)
      ctx.addIssue({
        code: 'custom',
        path: ['value', 'processed'],
        message: 'Lượt hoàn tất còn tin chưa xử lý',
      });
    if (run.value.status !== 'running' && (run.nextAt !== null || run.activeThreadId !== null))
      ctx.addIssue({
        code: 'custom',
        path: ['nextAt'],
        message: 'Lượt đã kết thúc không được giữ việc đang chạy',
      });
  });
export const mockReplyWorkflowSchema = z.strictObject({
  control: botReplyControlSchema,
  current: mockReplyRunSchema.nullable(),
  history: z.array(botReplyHistorySchema.extend({ personaId: z.string() })).max(100),
});
export type MockReplyRun = z.infer<typeof mockReplyRunSchema>;
export type MockReplyWorkflow = z.infer<typeof mockReplyWorkflowSchema>;
export const createMockReplyWorkflow = (): MockReplyWorkflow => ({
  control: { sampleSize: 50, delaySeconds: 5, lastScanAt: null },
  current: null,
  history: [],
});
