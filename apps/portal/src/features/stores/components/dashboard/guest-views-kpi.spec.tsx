import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import { GuestViewsKpi } from './dash-cards';
afterEach(cleanup);
describe('REQ-627 B15 guest-view dashboard card', () => {
  it('REQ-627 renders its own seven-day value, not the existing member view KPI', () => {
    render(<GuestViewsKpi views={1234} />);
    expect(screen.getByText('guestViews')).toBeDefined();
    expect(screen.getByText('1.234')).toBeDefined();
    expect(screen.getByText('viewsSub')).toBeDefined();
  });
});
