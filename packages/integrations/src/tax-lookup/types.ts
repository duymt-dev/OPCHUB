import { z } from 'zod';

export const taxInfoSchema = z.object({
  taxCode: z.string(),
  name: z.string(),
  address: z.string(),
  representative: z.string().nullable(),
  industries: z.array(z.string()),
  /** Trạng thái hoạt động theo nguồn (vd "Đang hoạt động") */
  status: z.string().nullable(),
});
export type TaxInfo = z.infer<typeof taxInfoSchema>;

/** D-17: chuỗi ESGOO → VietQR; lỗi hoặc không thấy → null (người dùng nhập tay) */
export interface TaxLookupProvider {
  readonly name: string;
  lookup(taxCode: string): Promise<TaxInfo | null>;
}
