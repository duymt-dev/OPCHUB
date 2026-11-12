import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { reportSchema } from '@opchub/shared/api-domains';
import type * as Ui from '@opchub/ui';
import source from '../../../../messages/vi/groups.json';
import en from '../../../../messages/en/groups.json';
import { AiReportActions } from './ai-report-actions';
import { ModerationRules } from './moderation-rules';

const state = vi.hoisted(() => ({
  mutate: vi.fn(),
  save: vi.fn(),
  aiSave: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('../hooks/use-moderation', () => ({
  useReportAction: () => ({ mutate: state.mutate, isPending: false }),
  useModerationSettings: () => ({
    days: 7,
    ai: true,
    save: { mutate: state.save },
    aiSave: { mutate: state.aiSave, isPending: false },
  }),
}));
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<typeof Ui>()),
  useToast: () => state.toast,
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const report = reportSchema.parse({
  id: 'report-1',
  senderName: 'Tên riêng',
  groupName: 'Nhóm riêng',
  body: 'Tin gốc',
  hit: 'ai:spam',
  reason: 'spam',
  source: 'auto',
  reporterCount: 0,
  status: 'open',
  createdAt: '2026-11-11T00:00:00Z',
  canLock: true,
});

describe('D-141 AC824-06/11 moderation chrome', () => {
  it('translates actions live without changing action names or report data', () => {
    const lock = vi.fn();
    const content = <AiReportActions report={report} days={7} onLock={lock} />;
    const view = render(
      <NextIntlClientProvider locale="en" messages={{ groups: en }}>
        {content}
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Awaiting Admin review · not counted as a violation yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hide message' }));
    expect(state.mutate).toHaveBeenLastCalledWith({ r: report, action: 'hide' });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(state.mutate).toHaveBeenLastCalledWith({ r: report, action: 'dismiss' });
    fireEvent.click(screen.getByRole('button', { name: 'Lock · Days: 7' }));
    expect(lock).toHaveBeenLastCalledWith(report);
    view.rerender(
      <NextIntlClientProvider locale="vi" messages={{ groups: source }}>
        {content}
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'Khóa 7 ngày' })).toBeTruthy();
    expect(state.mutate).toHaveBeenCalledTimes(2);
  });

  it('keeps the moderation switch payload canonical', () => {
    render(
      <NextIntlClientProvider locale="en" messages={{ groups: en }}>
        <ModerationRules />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Use AI to classify violating messages' }));
    expect(state.aiSave).toHaveBeenCalledWith({ autoLockDays: 7, ai: false });
  });
});
