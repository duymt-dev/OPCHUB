import { z } from 'zod';
import { affiliateBankSchema } from './affiliate';

/** D-120: ba ô cố định; thu hồi người đương nhiệm, không xóa vùng. */
export const DIRECTOR_REGIONS = ['north', 'central', 'south'] as const;
export const directorRegionSchema = z.enum(DIRECTOR_REGIONS);
export type DirectorRegion = z.infer<typeof directorRegionSchema>;
export const DIRECTOR_REGION_LABEL: Record<DirectorRegion, string> = {
  north: 'Miền Bắc',
  central: 'Trung & Tây Nguyên',
  south: 'Miền Nam',
};

const versionSchema = z.number().int().min(1).max(2_147_483_647);
// Existing demo members use stable ids such as m1; account directory verifies existence.
const memberIdSchema = z.string().trim().min(1).max(100);
// Catalog membership is checked by the domain against the 34 supported provinces.
const provinceSchema = z.string().trim().min(1).max(100);
export const directorProvincesSchema = z
  .array(provinceSchema)
  .max(34)
  .refine((items) => new Set(items).size === items.length, 'Tỉnh không được trùng lặp');

export const directorRegionParamsSchema = z.object({ region: directorRegionSchema });
export const directorAppointmentSchema = z.strictObject({
  region: directorRegionSchema,
  userId: memberIdSchema,
  version: versionSchema,
});
export type DirectorAppointment = z.infer<typeof directorAppointmentSchema>;
export const directorConfigPatchSchema = z.strictObject({
  version: versionSchema,
  provinces: directorProvincesSchema,
  bank: affiliateBankSchema.nullable(),
});
export type DirectorConfigPatch = z.infer<typeof directorConfigPatchSchema>;
export const directorRevokeSchema = z.strictObject({ version: versionSchema });

export const directorMemberSchema = z.object({
  id: memberIdSchema,
  memberCode: z.string(),
  fullName: z.string(),
  email: z.email(),
});
export type DirectorMember = z.infer<typeof directorMemberSchema>;
export const directorMemberQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});
export type DirectorMemberQuery = z.infer<typeof directorMemberQuerySchema>;
export const directorMemberPageSchema = z.object({
  items: z.array(directorMemberSchema),
  page: z.number().int().min(1),
  size: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
});

export const directorSlotSchema = z.object({
  region: directorRegionSchema,
  version: versionSchema,
  provinces: directorProvincesSchema,
  bank: affiliateBankSchema.nullable(),
  incumbent: directorMemberSchema.extend({ appointedAt: z.iso.datetime() }).nullable(),
  affiliateCount: z.number().int().min(0),
});
export type DirectorSlot = z.infer<typeof directorSlotSchema>;
export const directorConfigSchema = z
  .object({
    slots: z.array(directorSlotSchema).length(3),
    unassignedProvinces: directorProvincesSchema,
  })
  .superRefine(({ slots, unassignedProvinces }, ctx) => {
    if (new Set(slots.map((s) => s.region)).size !== DIRECTOR_REGIONS.length) {
      ctx.addIssue({ code: 'custom', path: ['slots'], message: 'Phải có đủ ba vùng cố định' });
    }
    const people = slots.flatMap((s) => (s.incumbent ? [s.incumbent.id] : []));
    if (new Set(people).size !== people.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['slots'],
        message: 'Mỗi thành viên chỉ phụ trách một vùng',
      });
    }
    const provinces = [...slots.flatMap((s) => s.provinces), ...unassignedProvinces];
    if (new Set(provinces).size !== provinces.length) {
      ctx.addIssue({ code: 'custom', path: ['slots'], message: 'Mỗi tỉnh chỉ thuộc một vùng' });
    }
  });
export type DirectorConfig = z.infer<typeof directorConfigSchema>;

const historyCursorSchema = z.object({ at: z.iso.datetime(), id: z.uuid() });
export const directorHistoryQuerySchema = z
  .object({
    region: directorRegionSchema.optional(),
    beforeAt: z.iso.datetime().optional(),
    beforeId: z.uuid().optional(),
    size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => Boolean(q.beforeAt) === Boolean(q.beforeId), {
    message: 'Con trỏ lịch sử phải có thời điểm và mã',
    path: ['beforeId'],
  });
export type DirectorHistoryQuery = z.infer<typeof directorHistoryQuerySchema>;
export const directorHistorySchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      region: directorRegionSchema,
      action: z.enum(['appointed', 'revoked', 'updated']),
      memberName: z.string().nullable(),
      actorName: z.string(),
      actorRole: z.string(),
      at: z.iso.datetime(),
      summary: z.string(),
    }),
  ),
  nextCursor: historyCursorSchema.nullable(),
});
export type DirectorHistory = z.infer<typeof directorHistorySchema>;
