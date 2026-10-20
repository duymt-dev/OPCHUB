import type { ExportParams } from '@opchub/shared/api-domains';
import { phoneCountries } from '@opchub/shared/fixtures';
import type { MemberExportRow, UserExportRow } from './export.repository';

type GroupField = Extract<ExportParams, { kind: 'group_members' }>['fields'][number];

/** Nhãn cột như màn Xuất của Admin (messages/vi/groups.json › export.field) */
const FIELD_LABEL: Record<GroupField, string> = {
  group: 'Nhóm',
  name: 'Họ và tên',
  email: 'Email',
  phone: 'Số điện thoại',
  type: 'Loại tài khoản',
  company: 'Công ty / Tổ chức',
  tax: 'Mã số thuế',
  grole: 'Vai trò trong nhóm',
  country: 'Quốc gia',
  date: 'Ngày tham gia',
  status: 'Trạng thái',
};
const LABEL: Record<string, string> = {
  business: 'Doanh nghiệp',
  personal: 'Cá nhân',
  investor: 'Nhà đầu tư',
  owner: 'Chủ nhóm',
  lecturer: 'Giảng viên',
  member: 'Thành viên',
  admin: 'Quản trị viên',
  active: 'Đang hoạt động',
  locked: 'Đã khóa',
};
const label = (k: string) => LABEL[k] ?? k;
const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const country = (cc: string) => phoneCountries.find((c) => c.id === cc)?.name ?? cc;

export const groupHead = (fields: readonly GroupField[]) => fields.map((f) => FIELD_LABEL[f]);

export function groupCells(r: MemberExportRow, fields: readonly GroupField[]): string[] {
  const cell: Record<GroupField, string> = {
    group: r.group_name,
    name: r.full_name,
    email: r.email,
    phone: r.phone ?? '',
    type: label(r.account_type === 'business' ? 'business' : 'personal'),
    company: r.company ?? '',
    tax: r.tax_code ?? '',
    grole: label(r.group_role),
    country: country(r.country),
    date: VN_DATE.format(r.joined_at),
    status: label(r.status),
  };
  return fields.map((f) => cell[f]);
}

export const USER_HEAD = [
  'Mã thành viên',
  'Họ và tên',
  'Email',
  'Số điện thoại',
  'Loại tài khoản',
  'Vai trò',
  'Trạng thái',
  'Công ty / Tổ chức',
  'Mã số thuế',
  'Ngày tham gia',
];

export const userCells = (r: UserExportRow): string[] => [
  r.member_code,
  r.full_name,
  r.email,
  r.phone ?? '',
  label(r.account_type),
  label(r.system_role),
  label(r.status),
  r.company ?? '',
  r.tax_code ?? '',
  VN_DATE.format(r.created_at),
];
