import { z } from 'zod';

const fields = {
  fromDate: z.iso.date().nullable(),
  toDate: z.iso.date().nullable(),
  paused: z.boolean(),
};

/** D-112: calendar dates are interpreted in Vietnam, never in the browser's timezone. */
export const botScheduleSchema = z.strictObject(fields).superRefine((value, ctx) => {
  if (value.fromDate && value.toDate && value.fromDate > value.toDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['toDate'],
      message: 'Ngày kết thúc phải từ ngày bắt đầu',
    });
  }
});

export const botSchedulePatchSchema = z.strictObject(fields).partial();
export const botScheduleStateSchema = z.enum(['paused', 'waiting', 'ended', 'live']);
export const botScheduleResponseSchema = z.strictObject({
  schedule: botScheduleSchema,
  state: botScheduleStateSchema,
});
export type BotSchedule = z.infer<typeof botScheduleSchema>;
export type BotSchedulePatch = z.infer<typeof botSchedulePatchSchema>;
export type BotScheduleState = z.infer<typeof botScheduleStateSchema>;
export const DEFAULT_BOT_SCHEDULE: BotSchedule = { fromDate: null, toDate: null, paused: false };
