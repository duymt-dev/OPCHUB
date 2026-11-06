import { z } from 'zod';
import { provinces } from '../fixtures';
import { MEMBERSHIP_FEE_STATUS } from '../enums';
import { affiliateBankSchema } from './affiliate';

export const REGIONAL_REGIONS = ['north', 'central', 'south'] as const;
export const regionalRegionSchema = z.enum(REGIONAL_REGIONS);
export type RegionalRegion = z.infer<typeof regionalRegionSchema>;
export const REGIONAL_LABELS: Record<RegionalRegion, string> = {
  north: 'Miền Bắc',
  central: 'Miền Trung & Tây Nguyên',
  south: 'Miền Nam',
};
const PROVINCE_LABELS = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' };
export const regionalProvinces = (region: RegionalRegion) =>
  provinces.filter(([, label]) => label === PROVINCE_LABELS[region]).map(([name]) => name);
export const regionalParamsSchema = z.object({ region: regionalRegionSchema });
export const regionalAppointSchema = regionalParamsSchema.extend({ userId: z.string().min(1) });
export const regionalCandidateQuerySchema = regionalParamsSchema.extend({
  q: z.string().trim().max(100).default(''),
});
export const regionalBankSchema = z.object({
  bankName: z.string().trim().min(1).max(100),
  bankNo: z
    .string()
    .trim()
    .regex(/^[\d ]+$/)
    .refine((s) => /^\d{6,20}$/.test(s.replace(/ /g, '')), 'Số tài khoản gồm 6–20 chữ số'),
  bankHolder: affiliateBankSchema.shape.bankHolder,
});
/** Structural HTTP parsing; semantic province membership is checked transactionally as 422. */
export const regionalPatchBodySchema = z
  .object({
    provinces: z
      .array(z.string().min(1))
      .max(34)
      .refine((s) => new Set(s).size === s.length)
      .optional(),
    bank: regionalBankSchema.optional(),
  })
  .refine((s) => s.provinces !== undefined || s.bank !== undefined);
export const regionalPatchSchema = regionalPatchBodySchema.superRefine((value, ctx) => {
  value.provinces?.forEach((province, i) => {
    if (!provinces.some(([name]) => name === province))
      ctx.addIssue({ code: 'custom', path: ['provinces', i], message: 'Tỉnh/thành không tồn tại' });
  });
});
export type RegionalPatch = z.infer<typeof regionalPatchSchema>;
export const regionalMemberSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
});
export const regionalCandidatesSchema = z.object({ items: z.array(regionalMemberSchema) });
export const regionalSlotSchema = z.object({
  region: regionalRegionSchema,
  label: z.string(),
  member: regionalMemberSchema.nullable(),
  provinces: z.array(z.string()),
  affiliateCount: z.number().int(),
  bank: z.object({ bankName: z.string(), bankNo: z.string(), bankHolder: z.string() }),
});
export type RegionalSlot = z.infer<typeof regionalSlotSchema>;
export const regionalHistorySchema = z.object({
  id: z.string(),
  region: regionalRegionSchema,
  userId: z.string(),
  userName: z.string(),
  action: z.enum(['appoint', 'revoke']),
  actorRole: z.string(),
  createdAt: z.iso.datetime(),
});
export const regionalDirectorsSchema = z.object({
  items: z.array(regionalSlotSchema).length(3),
  unassignedProvinces: z.number().int(),
  canManage: z.boolean(),
  history: z.array(regionalHistorySchema),
});
export type RegionalDirectors = z.infer<typeof regionalDirectorsSchema>;
export const regionalWriteResultSchema = z.object({ updated: z.literal(true) });
export const regionalRevokedSchema = regionalAppointSchema.extend({
  feeStatus: z.enum(MEMBERSHIP_FEE_STATUS),
  validUntil: z.iso.datetime().nullable(),
});
