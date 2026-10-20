import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { affiliateTestContext } from '../tests/context';
import { AgentPeriodAmount, AgentPeriodStatus } from './agent-period';

afterEach(cleanup);
describe('REQ-312 explicit API period presentation', () => {
  it('shows the supplied total, not unpaid balance or a fee/rate reconstruction', () => {
    render(
      <AgentPeriodAmount
        period={{
          month: '2026-09',
          customers: 6,
          commission: 123457,
          payable: 123456,
          paid: 0,
          status: 'recorded',
        }}
      />,
      affiliateTestContext(),
    );
    expect(screen.getByText('123.457đ')).toBeTruthy();
    expect(screen.getByText('6 khách')).toBeTruthy();
    expect(screen.queryByText('123.456đ')).toBeNull();
  });
  it.each([
    ['recorded', 'Chưa chi trả'],
    ['paid', 'Đã chi trả'],
    ['mixed', 'Một phần đã chi'],
    ['none', 'Không phát sinh hoa hồng'],
  ] as const)('labels %s from the API, not inferred amounts', (status, label) => {
    render(<AgentPeriodStatus status={status} />, affiliateTestContext());
    expect(screen.getByText(label)).toBeTruthy();
  });
});
