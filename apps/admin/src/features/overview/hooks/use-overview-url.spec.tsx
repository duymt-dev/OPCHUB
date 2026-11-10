import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOverviewUrl } from './use-overview-url';
import { overviewParamsSchema, overviewPresets, vnToday } from './overview-range';

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/overview');
});

describe('REQ-122 overview URL', () => {
  it('REQ-122 preserves filters and normalizes URL', () => {
    window.history.replaceState(null, '', '/overview?from=2024-02-29&to=2024-02-29&period=week');
    const h = renderHook(useOverviewUrl);
    act(() => h.result.current.update({ period: 'year' }));
    h.rerender();
    expect(h.result.current.params).toEqual({
      from: '2024-02-29',
      to: '2024-02-29',
      period: 'year',
    });
    h.unmount();
    const reload = renderHook(useOverviewUrl);
    expect(reload.result.current.params.period).toBe('year');
    act(() => reload.result.current.update({ from: '', to: '' }));
    reload.rerender();
    expect(window.location.search).toBe('?period=year');
  });
  it.each(['from=2026-02-29&to=2026-03-01', 'from=2026-01-01', 'from=2026-02-02&to=2026-02-01'])(
    'REQ-122 invalid pair falls back atomically: %s',
    (query) => {
      window.history.replaceState(null, '', `/overview?${query}&period=week`);
      const h = renderHook(useOverviewUrl);
      expect(h.result.current.params).toEqual({ from: '', to: '', period: 'week' });
      expect(window.location.search).toBe('?period=week');
      expect(overviewParamsSchema.parse({ period: 'bad' }).period).toBe('month');
    },
  );
  it('BUG-029 VN defaults and fresh presets independent of browser timezone', () => {
    let now = new Date('2026-10-31T17:00:00Z');
    expect(vnToday(now)).toBe('2026-11-01');
    const presets = overviewPresets(() => now);
    const values = () => presets.map((p) => p.value().map((d) => d.format('YYYY-MM-DD')));
    expect(values()).toEqual([
      ['2026-11-01', '2026-11-01'],
      ['2026-10-26', '2026-11-01'],
      ['2026-10-03', '2026-11-01'],
      ['2026-11-01', '2026-11-01'],
      ['2026-10-01', '2026-10-31'],
    ]);
    now = new Date('2026-11-01T17:00:00Z');
    expect(values()[0]).toEqual(['2026-11-02', '2026-11-02']);
  });
});
