import { describe, expect, it, vi } from 'vitest';
import { statCards } from './data';
import { flowCards, flowTextParams } from './flow';
import { OVERVIEW_FIXTURE } from '@opchub/shared/mock-domains';
import { prepareAdminIntl } from '@/i18n/intl/runtime';

const FLOW = {
  paidMembers: 1,
  members: 8,
  stores: { published: 17, hidden: 1, draft: 2 },
  needs: { open: 11, closed: 3 },
  projects: { pending: 2, published: 11 },
  groups: 90,
};

describe('D-141 system-flow prepared Myanmar presentation', () => {
  it('does not bypass scoped CLDR via native NumberFormat after preparation', async () => {
    await prepareAdminIntl('my');
    const native = vi.spyOn(Intl, 'NumberFormat');
    try {
      const cards = flowCards(FLOW, 'my');
      expect(cards.map((card) => card.value)).toEqual(['၁ / ၈', '၁၇', '၁၁', '၂', '၉၀']);
      expect(flowTextParams({ hidden: 0, draft: 1234 }, 'my')).toEqual({
        hidden: '၀',
        draft: '၁,၂၃၄',
      });
      expect(native).not.toHaveBeenCalled();
      expect(cards[1]?.sub).toEqual({ hidden: 1, draft: 2 });
      expect(FLOW.stores).toEqual({ published: 17, hidden: 1, draft: 2 });
    } finally {
      native.mockRestore();
    }
  });

  it.each(['vi', 'en', 'en-SG', 'zh', 'id', 'th', 'ms', 'ms-BN', 'fil', 'km', 'lo'])(
    '%s retains counts, status, routes and raw parameters while formatting presentation',
    async (locale) => {
      await prepareAdminIntl(locale);
      const snapshot = structuredClone(FLOW);
      const cards = flowCards(FLOW, locale);
      const raw = (card: (typeof cards)[number]) => ({
        key: card.key,
        href: card.href,
        done: card.done,
        sub: card.sub,
      });
      expect(cards.map(raw)).toEqual(flowCards(FLOW).map(raw));
      expect(FLOW).toEqual(snapshot);
      expect(flowTextParams({ count: 0 }, locale)).toEqual({ count: '0' });
    },
  );
});

describe('D-89 Tổng quan v4 — Luồng hệ thống + 4 thẻ số', () => {
  it('5 thẻ theo thứ tự prototype; dự án còn chờ duyệt → "Cần làm", hết chờ → "Hoàn tất"', () => {
    const c = flowCards(FLOW);
    expect(c.map((x) => x.key)).toEqual(['fees', 'stores', 'needs', 'projects', 'groups']);
    expect(c[0]).toMatchObject({ value: '1 / 8', href: '/fees', done: true });
    expect(c[1]?.sub).toEqual({ hidden: 1, draft: 2 });
    expect(c[3]).toMatchObject({ href: '/projects?tab=pending', done: false });
    expect(flowCards({ ...FLOW, projects: { pending: 0, published: 11 } })[3]?.done).toBe(true);
  });

  it('thẻ số: Thành viên · Cộng đồng · Thành viên mới (Tháng MM/YYYY) · Sự kiện (n sắp diễn ra)', () => {
    const s = statCards({ ...OVERVIEW_FIXTURE, flow: FLOW });
    expect(s.map((x) => x.key)).toEqual(['members', 'communities', 'fresh', 'events']);
    expect(s[0]).toMatchObject({ value: 20000, delta: { pct: 12 } });
    expect(s[2]).toMatchObject({ value: 2165, delta: { month: '10/2026' } });
    expect(s[2]?.spark).toHaveLength(7);
    expect(s[3]).toMatchObject({ value: 12, delta: { n: 4 } });
  });
});
