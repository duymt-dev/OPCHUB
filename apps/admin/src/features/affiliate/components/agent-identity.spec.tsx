import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { affiliateTestContext } from '../tests/context';
import { AgentIdentity } from './agent-identity';

afterEach(cleanup);

describe('REQ-312 agent identity uses the supplied account and lifecycle status', () => {
  it('links the actual agent id and preserves its email with the automatic label', () => {
    render(
      <AgentIdentity
        id="agent/1"
        name="Lê Thu Hà"
        email="ha.le@opcmedia.vn"
        status="active"
        bank={null}
      />,
      affiliateTestContext(),
    );
    expect(screen.getByRole('link', { name: /^Lê Thu Hà$/ }).getAttribute('href')).toBe(
      '/affiliate/agent%2F1',
    );
    expect(screen.getByText('ha.le@opcmedia.vn')).toBeTruthy();
    expect(screen.getByText('Tự động')).toBeTruthy();
  });

  it('does not present a paused account as active or invent a null bank account', () => {
    render(
      <AgentIdentity
        id="a3"
        name="Lê Thu Hà"
        email="ha.le@opcmedia.vn"
        status="paused"
        bank={null}
      />,
      affiliateTestContext(),
    );
    expect(screen.getByText('Tạm dừng')).toBeTruthy();
    expect(screen.queryByText('Tự động')).toBeNull();
    expect(screen.queryByText(/24681357|ACB/)).toBeNull();
  });

  it('renders the live bank supplied by the list API without inventing it from the agent name', () => {
    render(
      <AgentIdentity
        id="a3"
        name="Display name"
        email="ha.le@opcmedia.vn"
        status="active"
        bank={{ bankHolder: 'LE THU HA', bankName: 'ACB', bankNo: '24681357' }}
      />,
      affiliateTestContext(),
    );
    expect(screen.getByText('LE THU HA · ACB · 24681357')).toBeTruthy();
    expect(screen.queryByText('Chưa có số tài khoản')).toBeNull();
  });
});
