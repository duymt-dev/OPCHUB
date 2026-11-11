import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { RegionalSlot } from '@opchub/shared/api-domains';
import en from '../../../../../messages/en/affiliate.json';
import enUi from '../../../../../messages/en/ui.json';
import source from '../../../../../messages/vi/affiliate.json';
import viUi from '../../../../../messages/vi/ui.json';
import { setupAffiliateBrowser } from '../../tests/context';
import { RegionalAssignment } from './regional-assignment';
import { RegionalSlotSummary } from './regional-slot-summary';

vi.mock('../hooks/use-regional-directors', () => ({
  useRegionalCandidates: () => ({ data: { items: [] }, isFetching: false }),
}));
vi.mock('../hooks/use-regional-confirmations', () => ({
  useRegionalConfirmations: () => ({ change: vi.fn(), revoke: vi.fn() }),
}));
beforeEach(setupAffiliateBrowser);
afterEach(cleanup);

it.each([
  ['north', 'Northern', 'Miền Bắc'],
  ['central', 'Central & Central Highlands', 'Miền Trung & Tây Nguyên'],
  ['south', 'Southern', 'Miền Nam'],
] as const)(
  'D-141 AC824-06/11 projects actual %s slot/aria labels by enum, never by API label',
  (region, english, vietnamese) => {
    const slot: RegionalSlot = {
      region,
      label: 'RAW_API_REGION_LABEL',
      provinces: [],
      affiliateCount: 1234,
      member: { id: 'member-id', fullName: 'Tên riêng không dịch', email: 'member@example.test' },
      bank: { bankName: '', bankNo: '', bankHolder: '' },
    };
    const before = JSON.stringify(slot);
    const mutate = vi.fn();
    const close = vi.fn();
    const view = (locale: 'en' | 'vi') => (
      <NextIntlClientProvider
        locale={locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ affiliate: locale === 'en' ? en : source, ui: locale === 'en' ? enUi : viUi }}
      >
        <RegionalSlotSummary slot={slot} canManage={false} pending={false} onRevoke={close} />
        <RegionalAssignment
          slot={slot}
          disabled
          forceOpen={false}
          onClose={close}
          mutate={mutate}
        />
      </NextIntlClientProvider>
    );
    const rendered = render(view('en'));
    expect(screen.getAllByText(english)).toHaveLength(2);
    expect(
      screen.getByRole<HTMLInputElement>('combobox', { name: `Responsible member ${english}` })
        .disabled,
    ).toBe(true);
    expect(screen.queryByText(slot.label)).toBeNull();
    rendered.rerender(view('vi'));
    expect(screen.getAllByText(vietnamese)).toHaveLength(2);
    expect(screen.getAllByText(slot.member?.fullName ?? '')).toHaveLength(1);
    expect(mutate).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(JSON.stringify(slot)).toBe(before);
  },
);
