import { z } from 'zod';
import { BIZ_SIZES } from '../fixtures/register';
import { taxCodeSchema } from './auth';

/**
 * V4-607 (UP-02, REQ-504): khai báo sau đăng nhập — `PUT /v1/me/declaration`.
 * Thông điệp lỗi đúng prototype v4 (popup Thông tin cá nhân / Khai báo doanh nghiệp).
 */
const groupIds = z.array(z.string()).min(1, 'Vui lòng chọn OPC bạn muốn tham gia').max(34);

export const personalDeclarationSchema = z.object({
  accountType: z.literal('personal'),
  persona: z.string().trim().min(1, 'Vui lòng chọn bạn là ai').max(100),
  groupIds,
});

export const businessDeclarationSchema = z.object({
  accountType: z.literal('business'),
  taxCode: z.string().trim().min(1, 'Vui lòng nhập mã số thuế').pipe(taxCodeSchema),
  companyName: z.string().trim().min(1, 'Vui lòng nhập tên doanh nghiệp').max(200),
  mainIndustry: z.string().trim().min(1, 'Vui lòng nhập ngành nghề kinh doanh').max(200),
  size: z.enum(BIZ_SIZES),
  province: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn tỉnh/thành đăng ký kinh doanh trong danh sách')
    .max(64),
  groupIds,
});

export const declarationSchema = z.discriminatedUnion('accountType', [
  personalDeclarationSchema,
  businessDeclarationSchema,
]);
export type DeclarationRequest = z.infer<typeof declarationSchema>;
export type PersonalDeclaration = z.infer<typeof personalDeclarationSchema>;
export type BusinessDeclaration = z.infer<typeof businessDeclarationSchema>;

/** Giá trị điền sẵn cho popup (dữ liệu đã nhập lúc đăng ký) — `GET /v1/me/declaration` */
export const declarationDraftSchema = z.object({
  persona: z.string().nullable(),
  groupIds: z.array(z.string()),
  business: z
    .object({
      taxCode: z.string(),
      companyName: z.string(),
      mainIndustry: z.string(),
      size: z.string().nullable(),
      province: z.string().nullable(),
    })
    .nullable(),
});
export type DeclarationDraft = z.infer<typeof declarationDraftSchema>;
