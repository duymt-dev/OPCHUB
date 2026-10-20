import { z } from 'zod';
import { affiliateBankSchema } from '../api-domains/affiliate';
import rawCustomers from './affiliate-customers.json' with { type: 'json' };

/** AF0 data only, not prototype rendering/business code. Dates are fixed in VN time. */
export const AFFILIATE_DEMO_DAY = '2026-10-16';
export const affiliateDemoAgents = [
  {
    id: 'a1',
    userId: 'm1',
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@mediasoft.vn',
    code: 'OPCAN26',
    rate: 20,
    clicks: 412,
    joined: '2026-09-02',
    bank: { bankName: 'Vietcombank', bankNo: '0451000123456', bankHolder: 'NGUYEN VAN AN' },
  },
  {
    id: 'a2',
    userId: 'af-owner-a2',
    name: 'Trần Minh Khoa',
    email: 'khoa.tran@gmail.com',
    code: 'KHOAOPC',
    rate: 20,
    clicks: 286,
    joined: '2026-08-15',
    bank: { bankName: 'Techcombank', bankNo: '190355667788', bankHolder: 'TRAN MINH KHOA' },
  },
  {
    id: 'a3',
    userId: 'af-owner-a3',
    name: 'Lê Thu Hà',
    email: 'ha.le@opcmedia.vn',
    code: 'HAOPC',
    rate: 25,
    clicks: 905,
    joined: '2026-08-01',
    bank: { bankName: 'ACB', bankNo: '24681357', bankHolder: 'LE THU HA' },
  },
  {
    id: 'a4',
    userId: 'af-owner-a4',
    name: 'Phạm Quốc Bảo',
    email: 'bao.pham@outlook.com',
    code: 'BAOPQ',
    rate: 20,
    clicks: 133,
    joined: '2026-09-20',
    bank: { bankName: 'MB Bank', bankNo: '0123456789', bankHolder: 'PHAM QUOC BAO' },
  },
  {
    id: 'a5',
    userId: 'af-owner-a5',
    name: 'CLB Khởi nghiệp ĐH Bách khoa',
    email: 'startup@hust.edu.vn',
    code: 'HUSTOPC',
    rate: 30,
    clicks: 1204,
    joined: '2026-07-25',
    bank: { bankName: 'BIDV', bankNo: '125100008899', bankHolder: 'CLB KHOI NGHIEP DHBK' },
  },
  {
    id: 'a6',
    userId: 'af-owner-a6',
    name: 'Hoàng Gia Linh',
    email: 'linh.hg@gmail.com',
    code: 'LINHOPC',
    rate: 20,
    clicks: 64,
    joined: '2026-10-05',
    bank: { bankName: 'VPBank', bankNo: '22334455', bankHolder: 'HOANG GIA LINH' },
  },
].map((a) => ({ ...a, bank: affiliateBankSchema.parse(a.bank) }));

// Repeated display names in C0 are different people: each row needs its own user/first fee.
export const affiliateDemoCustomers = z
  .array(
    z.object({
      id: z.string(),
      affiliateId: z.string(),
      name: z.string(),
      paidAt: z.iso.datetime(),
      status: z.enum(['recorded', 'paid', 'cancelled']),
    }),
  )
  .parse(rawCustomers)
  .map((c) => ({
    ...c,
    userId: `af-customer-${c.id}`,
    month: new Date(Date.parse(c.paidAt) + 7 * 3_600_000).toISOString().slice(0, 7),
  }));

export const affiliateDemoPaidAt = (month: string) => {
  const [year = 2026, m = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0, -7)).toISOString();
};

/** Coherent paid owner history: the account must predate every attributed payment. */
export function affiliateDemoStartedAt(agentId: string): string {
  const agent = affiliateDemoAgents.find((a) => a.id === agentId);
  if (!agent) throw new Error('Unknown affiliate demo agent');
  const joined = Date.parse(`${agent.joined}T00:00:00+07:00`);
  const payments = affiliateDemoCustomers
    .filter((c) => c.affiliateId === agentId)
    .map((c) => Date.parse(c.paidAt) - 86_400_000);
  return new Date(Math.min(joined, ...payments)).toISOString();
}
