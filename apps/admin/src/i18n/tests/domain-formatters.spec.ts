import { describe, expect, it } from 'vitest';
import type { Campaign } from '@opchub/shared/api-domains';
import {
  affiliateDate,
  affiliateHistoryDate,
  affiliateMoney,
  affiliateBankNo,
} from '../../features/affiliate/format';
import {
  affiliateMonthLabel,
  affiliateQuery,
  isClosedAffiliateMonth,
} from '../../features/affiliate/model';
import {
  affiliateCostRatio,
  affiliatePayoutCalendar,
} from '../../features/affiliate/summary-presentation';
import { formatCount as eventCount, vnToIso, vnDateOf } from '../../features/events/model';
import { formatCount as groupCount } from '../../features/groups/model';
import { money, shortDate, stamp } from '../../features/investors/model';
import {
  campaignCells,
  statValues,
  vnDateTime,
  localToIso,
  duplicateForm,
  formToCreate,
} from '../../features/marketing/model';
import { needDate } from '../../features/needs/model';
import { formatMoney, vnDate as projectDate } from '../../features/projects/model';
import { fmt, monthLabel, reportMonths, toParams } from '../../features/reports/model';
import { vnDate as requestDate, commentTime } from '../../features/requests/model';
import { vnd } from '../../features/settings/model';
import { itemPrice, storeDate } from '../../features/stores/model';
import { formatCurrency, formatDate, formatNumber } from '../format';

const BOUNDARY = '2026-12-31T17:00:00Z';
const LOCALES = ['vi', 'en', 'en-SG', 'zh', 'id', 'th', 'ms', 'ms-BN', 'fil', 'km', 'lo', 'my'];
const campaign: Campaign = {
  id: 'raw-id',
  name: 'Tên gốc',
  subject: 'Tiêu đề gốc',
  body: '<p>Nội dung gốc</p>',
  audience: 'groups',
  groupIds: ['raw-group'],
  audienceLabel: 'Nhóm gốc',
  recipients: 1234,
  openRate: 12.5,
  clickRate: 0,
  status: 'sent',
  sendAt: BOUNDARY,
  createdAt: BOUNDARY,
};

describe('D-141 AC824-08 cross-domain display adapters', () => {
  it.each(LOCALES)('uses the supplied %s locale throughout dates, counts and VND', (locale) => {
    for (const display of [storeDate, needDate, projectDate, requestDate, affiliateDate]) {
      expect(display(BOUNDARY, locale)).toBe(formatDate(BOUNDARY, locale));
      expect(display('bad', locale)).toBe('—');
    }
    for (const display of [eventCount, groupCount, fmt]) {
      expect(display(1234, locale)).toBe(formatNumber(1234, locale));
      expect(display(0, locale)).toBe(formatNumber(0, locale));
      expect(display(-1234, locale)).toBe(formatNumber(-1234, locale));
      expect(display(NaN, locale)).toBe('—');
    }
    for (const display of [vnd, affiliateMoney]) {
      expect(display(1234, locale)).toBe(formatCurrency(1234, 'VND', locale));
      expect(display(0, locale)).toBe(formatCurrency(0, 'VND', locale));
      expect(display(-1234, locale)).toBe(formatCurrency(-1234, 'VND', locale));
      expect(display(Infinity, locale)).toBe('—');
    }
    expect(itemPrice({ price: 1234 }, 'contact', locale)).toBe(formatCurrency(1234, 'VND', locale));
    expect(itemPrice({ price: 0 }, 'contact', locale)).toBe('contact');
    expect(itemPrice({ price: null }, 'contact', locale)).toBe('contact');
    expect(itemPrice({ price: -1234 }, 'contact', locale)).toBe(
      formatCurrency(-1234, 'VND', locale),
    );
    expect(affiliateDate(null, locale)).toBe('—');
    expect(affiliateHistoryDate(null, locale)).toBe('—');
    expect(affiliateMonthLabel('custom-key', locale)).toBe('custom-key');
  });

  it('retains padded versus non-padded Vietnamese dates and full timestamps', () => {
    expect(shortDate(BOUNDARY)).toBe('1/1/2027');
    expect(affiliateHistoryDate(BOUNDARY)).toBe('1/1/2027');
    expect(affiliateDate(BOUNDARY)).toBe('01/01/2027');
    expect(stamp(BOUNDARY)).toBe('00:00 · 1/1/2027');
    expect(vnDateTime(BOUNDARY)).toBe('01/01/2027 00:00');
    expect(vnDateTime(null, 'en')).toBe('—');
    expect(stamp('bad', 'en')).toBe('—');
    expect(commentTime(BOUNDARY, 'th')).not.toContain('2570');
    expect(vnDateTime(BOUNDARY, 'th')).toContain('2027');
    expect(monthLabel('2027-01', 'zh')).toBe('2027年1月');
    expect(affiliateMonthLabel('2027-01', 'zh')).toBe('2027年1月');
    expect(monthLabel('2027-01')).toBe('01/2027');
  });

  it('uses identical compact project and investor displays without changing valid amounts', () => {
    for (const locale of LOCALES) {
      for (const currency of ['VND', 'USD'] as const) {
        for (const amount of [0, -1234, 1234, 1500000, 1150000000, Number.MAX_SAFE_INTEGER]) {
          expect(money(amount, currency, locale)).toBe(formatMoney(amount, currency, locale));
        }
      }
      expect(money(NaN, 'VND', locale)).toBe('—');
    }
  });

  it('localizes campaign cells without changing statuses, null semantics or message content', () => {
    const before = structuredClone(campaign);
    expect(campaignCells(campaign)).toMatchObject({
      recipients: '1.234',
      open: '12.5%',
      click: '0%',
      canSend: false,
    });
    expect(campaignCells(campaign, 'en')).toMatchObject({
      recipients: '1,234',
      open: '12.5%',
      click: '0%',
      canSend: false,
    });
    expect(campaignCells({ ...campaign, recipients: 0, openRate: null }, 'en')).toMatchObject({
      recipients: '—',
      open: '—',
    });
    for (const status of ['sent', 'draft', 'scheduled', 'sending', 'cancelled'] as const) {
      const raw = { ...campaign, status };
      const vi = campaignCells(raw);
      const en = campaignCells(raw, 'en');
      for (const key of ['canSend', 'canDelete', 'canCancel'] as const)
        expect(en[key]).toBe(vi[key]);
    }
    expect(statValues(undefined, 'en')).toEqual({
      campaigns: '—',
      sent: '—',
      open: '—',
      welcome: '—',
    });
    expect(
      statValues({ campaigns: 1234, sent30d: 1234, avgOpenRate: null, welcomeSent: 1234 }, 'en'),
    ).toEqual({ campaigns: '1,234', sent: '1,234', open: '—', welcome: '1,234' });
    expect(campaign).toEqual(before);
    const duplicate = duplicateForm(campaign);
    expect(duplicate.name).toBe('Tên gốc (bản sao)');
    expect(formToCreate(duplicate, 'draft')).toMatchObject({
      subject: campaign.subject,
      body: campaign.body,
      audience: campaign.audience,
      groupIds: campaign.groupIds,
    });
  });

  it('preserves business rounding/calendar and canonical query/parser/bank values', () => {
    expect(affiliateCostRatio(7470000, 30000000)).toBe('24.9');
    expect(affiliateCostRatio(7470000, 30000000, 'id')).toBe('24,9');
    expect(affiliateCostRatio(0, 0, 'en')).toBeUndefined();
    expect(affiliatePayoutCalendar(Date.parse(BOUNDARY), 'zh')).toBe('2027/01/31');
    expect(affiliatePayoutCalendar(Date.parse('2028-02-10T00:00:00Z'))).toBe('29/02/2028');
    expect(affiliateQuery({ page: 2, size: 10, month: '2027-01' })).toBe(
      'page=2&size=10&month=2027-01',
    );
    expect(isClosedAffiliateMonth('2026-12', Date.parse(BOUNDARY))).toBe(true);
    expect(affiliateBankNo('24681357')).toBe('2468 1357');
    expect(reportMonths(Date.parse(BOUNDARY))[0]).toBe('2026-12');
    expect(toParams({ template: 'b1', month: '2027-01', scope: 'raw-group' })).toEqual({
      template: 'b1',
      month: '2027-01',
      groupId: 'raw-group',
    });
    expect(vnDateOf(BOUNDARY)).toBe('2027-01-01');
    expect(vnToIso('2027-01-01', '00:00')).toBe('2026-12-31T17:00:00.000Z');
    expect(localToIso('2027-01-01T00:00')).toBe('2026-12-31T17:00:00.000Z');
    expect(localToIso('01/01/2027 00:00')).toBeNull();
  });
});
