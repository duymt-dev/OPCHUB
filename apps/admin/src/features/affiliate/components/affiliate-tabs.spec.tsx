import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { affiliateTestContext } from '../tests/context';
import { AffiliateTabs } from './affiliate-tabs';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TIP-V46-812 selected affiliate tab remains in its own horizontal viewport', () => {
  it('scrolls the tablist, not the page, and preserves all tabs and actions', () => {
    const scrollPage = vi.spyOn(window, 'scrollTo');
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const left = this.getAttribute('role') === 'tab' ? 450 : 0;
      const width = this.getAttribute('role') === 'tab' ? 70 : 300;
      return {
        x: left,
        y: 0,
        left,
        top: 0,
        right: left + width,
        bottom: 40,
        width,
        height: 40,
        toJSON: () => ({}),
      };
    });
    const onTab = vi.fn();
    render(
      <AffiliateTabs tab="cfg" onTab={onTab} counts={{ com: 53, aff: 62, gdv: 3 }} net={100} />,
      affiliateTestContext(),
    );
    expect(screen.getByRole('tablist').scrollLeft).toBe(220);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: 'Chính sách' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('tab', { name: /^Affiliate/ }));
    expect(onTab).toHaveBeenCalledExactlyOnceWith('aff');
    expect(scrollPage).not.toHaveBeenCalled();
  });
});
