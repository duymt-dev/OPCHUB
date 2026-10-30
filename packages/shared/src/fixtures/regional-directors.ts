import type { DirectorRegion } from '../api-domains/regional-directors';
import type { AffiliateBank } from '../api-domains/affiliate';
import type { DemoAccount, MemberSeed } from './types';

/** v4.6 data: docs/spec/index.html:5187–5188, 5242, 5960 (no rendering code). */
export const directorDemoMembers: MemberSeed[] = [
  {
    id: 'm9',
    type: 'biz',
    name: 'Lê Minh Hải',
    email: 'hai.lm@mediasoft.vn',
    cc: 'vn',
    phone: '+84 905 312 668',
    org: 'Media Soft',
    company: 'Công ty CP Tập đoàn Media Soft',
    tax: '0401234567',
    field: 'Phát triển mạng lưới',
    size: '1 người (OPC)',
    bizCountry: 'Việt Nam',
    position: 'Giám đốc Vùng Miền Trung & Tây Nguyên',
    verify: 'verified',
    role: 'Thành viên',
    date: '01/10/2026',
    persona: 'Doanh nghiệp',
    groups: ['c4'],
  },
  {
    id: 'm10',
    type: 'biz',
    name: 'Phạm Thu Hà',
    email: 'ha.pt@mediasoft.vn',
    cc: 'vn',
    phone: '+84 909 527 314',
    org: 'Media Soft',
    company: 'Công ty CP Tập đoàn Media Soft',
    tax: '0312345678',
    field: 'Phát triển mạng lưới',
    size: '1 người (OPC)',
    bizCountry: 'Việt Nam',
    position: 'Giám đốc Vùng Miền Nam',
    verify: 'verified',
    role: 'Thành viên',
    date: '01/10/2026',
    persona: 'Doanh nghiệp',
    groups: ['c1'],
  },
];

export const DIRECTOR_DEMO: {
  region: DirectorRegion;
  userId: string;
  name: string;
  email: string;
  label: string;
  appointedAt: string;
  bank: AffiliateBank;
}[] = [
  {
    region: 'north',
    userId: 'm3',
    name: 'Trần Quốc Bảo',
    email: 'bao.tran@solobooks.vn',
    label: 'GĐ Vùng Miền Bắc',
    appointedAt: '2026-10-01T00:00:00.000Z',
    bank: { bankName: 'Vietcombank', bankNo: '001100104567', bankHolder: 'TRAN QUOC BAO' },
  },
  {
    region: 'central',
    userId: 'm9',
    name: 'Lê Minh Hải',
    email: 'hai.lm@mediasoft.vn',
    label: 'GĐ Vùng Miền Trung & Tây Nguyên',
    appointedAt: '2026-10-01T00:00:00.000Z',
    bank: { bankName: 'Vietcombank', bankNo: '001100204567', bankHolder: 'LE MINH HAI' },
  },
  {
    region: 'south',
    userId: 'm10',
    name: 'Phạm Thu Hà',
    email: 'ha.pt@mediasoft.vn',
    label: 'GĐ Vùng Miền Nam',
    appointedAt: '2026-10-01T00:00:00.000Z',
    bank: { bankName: 'Vietcombank', bankNo: '001100304567', bankHolder: 'PHAM THU HA' },
  },
];

export const directorDemoAccounts = (pwd: string): DemoAccount[] =>
  DIRECTOR_DEMO.map((row) => ({
    email: row.email,
    pwd,
    role: 'user',
    meId: row.userId,
    label: row.label,
  }));
