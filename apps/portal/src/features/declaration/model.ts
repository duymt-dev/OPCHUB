import { TAX_CODE_RE } from '@opchub/shared/api';
import { communities, provinces } from '@opchub/shared/fixtures';

/** So khớp không dấu như prototype `regOq` (N = bỏ dấu, đ → d) */
export const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

export interface OpcOption {
  id: string;
  province: string;
  region: string;
  members: number;
}

/** OPC theo 34 tỉnh/thành: mỗi tỉnh trỏ nhóm cộng đồng của tỉnh đó (D-71: vào ngay) */
export const OPC_OPTIONS: OpcOption[] = provinces.flatMap(([province, region]) => {
  const c = communities.find((g) => g.province === province);
  return c ? [{ id: c.id, province, region, members: c.members }] : [];
});

/** Prototype: chưa gõ → 8 tỉnh đầu; có từ khoá → tối đa 12 */
export function filterOpc(q: string): OpcOption[] {
  const nq = fold(q.trim());
  return OPC_OPTIONS.filter((o) => !nq || fold(o.province).includes(nq)).slice(0, nq ? 12 : 8);
}

export const PROVINCE_NAMES = provinces.map(([name]) => name);
export const provinceRegion = (name: string) => provinces.find(([p]) => p === name)?.[1] ?? '';

export function filterProvinces(q: string): string[] {
  const nq = fold(q.trim());
  return PROVINCE_NAMES.filter((p) => !nq || fold(p).includes(nq));
}

export type PersonalErrKey = 'persona' | 'groups';
export type BizErrKey = 'tax' | 'company' | 'industry' | 'province' | 'groups';

/** Thứ tự kiểm như prototype `pdSave` — trả lỗi đầu tiên (khoá i18n `declaration.err.*`) */
export function validatePersonal(persona: string, groupIds: string[]) {
  if (!persona) return { key: 'persona', msg: 'persona' } as const;
  if (!groupIds.length) return { key: 'groups', msg: 'groups' } as const;
  return null;
}

export interface BizDraft {
  tax: string;
  found: boolean;
  companyName: string;
  mainIndustry: string;
  province: string;
  groupIds: string[];
}

/** Như prototype `bdSave`; thêm kiểm định dạng MST (taxCodeSchema) trước "Tra cứu" */
export function validateBusiness(d: BizDraft) {
  const tax = d.tax.trim();
  if (!tax) return { key: 'tax', msg: 'tax' } as const;
  if (!TAX_CODE_RE.test(tax)) return { key: 'tax', msg: 'taxFormat' } as const;
  if (!d.found) return { key: 'tax', msg: 'lookup' } as const;
  if (!d.companyName.trim()) return { key: 'company', msg: 'company' } as const;
  if (!d.mainIndustry.trim()) return { key: 'industry', msg: 'industry' } as const;
  if (!PROVINCE_NAMES.includes(d.province.trim()))
    return { key: 'province', msg: 'province' } as const;
  if (!d.groupIds.length) return { key: 'groups', msg: 'groups' } as const;
  return null;
}
