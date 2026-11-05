import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import affiliate from '../../../../messages/vi/affiliate.json';
import { AffiliateLocked } from './affiliate-hero';

afterEach(cleanup);
describe('D-131 locked affiliate policy preview', () => {
  it.each([
    [10, 3],
    [15, 4],
  ])('uses current renewal policy %i through year %i', (renewalRate, renewalMaxYear) => {
    render(
      <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
        <AffiliateLocked
          policy={{
            rate: 20,
            perAmount: 240000,
            bizAmount: 720000,
            fundAmount: 1500000,
            fundRate: 10,
            cookieDays: 30,
            renewalRate,
            renewalMaxYear,
          }}
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByText(new RegExp(`${renewalRate}% ở năm 2–${renewalMaxYear} khi khách gia hạn`)),
    ).toBeDefined();
  });
});
