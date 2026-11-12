import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { Table } from 'antd';
import { useState, type ReactNode } from 'react';
import type { AiCallItem, AiCallsFilter } from '@opchub/shared/api-domains';
import en from '../../../../../messages/en/settings/ai.json';
import source from '../../../../../messages/vi/settings/ai.json';
import { AiCallFilters } from './ai-call-filters';
import { useAiCallColumns } from './ai-call-columns';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const initial: AiCallsFilter = {
  from: '2026-11-01T00:00:00+07:00',
  to: '2026-11-11T23:59:59+07:00',
};
const row: AiCallItem = {
  id: 'call-1',
  at: '2026-11-10T17:00:00.000Z',
  purpose: 'script',
  provider: 'openai',
  model: 'owner-model-123',
  promptTokens: 1234,
  completionTokens: 24,
  cost: 12345,
  latencyMs: 1099,
  status: 'error',
  errorCode: 'RAW_ERROR_123',
  actor: { realm: 'admin', id: 'raw-actor-id' },
};
function Labels({ locale, children }: { locale: 'vi' | 'en'; children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="Asia/Ho_Chi_Minh"
      messages={{ settings: locale === 'vi' ? source : en }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
function Calls({ provider = row.provider }: { provider?: AiCallItem['provider'] }) {
  return (
    <Table
      rowKey="id"
      columns={useAiCallColumns()}
      dataSource={[{ ...row, provider }]}
      pagination={false}
    />
  );
}

describe('D-141 AC824-06/08/11 AI log live presentation', () => {
  it('projects the custom provider in the actual filter while retaining its API ID and draft', () => {
    const changed = vi.fn();
    function Filters() {
      const [value, setValue] = useState(initial);
      return (
        <AiCallFilters
          value={value}
          onChange={(next) => {
            setValue(next);
            changed(next);
          }}
        />
      );
    }
    const view = render(
      <Labels locale="en">
        <Filters />
      </Labels>,
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Log provider' }));
    fireEvent.click(
      screen.getByText('Custom (OpenAI-compatible)', {
        selector: '.ant-select-item-option-content',
      }),
    );
    expect(changed).toHaveBeenLastCalledWith({ ...initial, provider: 'custom' });
    view.rerender(
      <Labels locale="vi">
        <Filters />
      </Labels>,
    );
    expect(screen.getByTitle('Tùy chỉnh (OpenAI-compatible)')).toBeTruthy();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('projects the custom provider in actual log cells without modifying the raw row', () => {
    const before = JSON.stringify(row);
    const view = render(
      <Labels locale="en">
        <Calls provider="custom" />
      </Labels>,
    );
    expect(screen.getByRole('cell', { name: 'Custom (OpenAI-compatible)' })).toBeTruthy();
    view.rerender(
      <Labels locale="vi">
        <Calls provider="custom" />
      </Labels>,
    );
    expect(screen.getByRole('cell', { name: 'Tùy chỉnh (OpenAI-compatible)' })).toBeTruthy();
    expect(screen.getByText('owner-model-123')).toBeTruthy();
    expect(JSON.stringify(row)).toBe(before);
  });
  it('switches filters without losing canonical values or firing a change', () => {
    const changed = vi.fn();
    function Filters() {
      const [value, setValue] = useState(initial);
      return (
        <AiCallFilters
          value={value}
          onChange={(next) => {
            setValue(next);
            changed(next);
          }}
        />
      );
    }
    const view = render(
      <Labels locale="en">
        <Filters />
      </Labels>,
    );
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-02' } });
    expect(changed).toHaveBeenLastCalledWith({ ...initial, from: '2026-11-01T17:00:00.000Z' });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'AI purpose' }));
    fireEvent.click(screen.getByText('Script', { selector: '.ant-select-item-option-content' }));
    expect(changed).toHaveBeenLastCalledWith({
      ...initial,
      from: '2026-11-01T17:00:00.000Z',
      purpose: 'script',
    });
    const count = changed.mock.calls.length;
    view.rerender(
      <Labels locale="vi">
        <Filters />
      </Labels>,
    );
    expect(screen.getByLabelText<HTMLInputElement>('Từ ngày').value).toBe('2026-11-02');
    expect(screen.getByTitle('Kịch bản')).toBeTruthy();
    expect(changed).toHaveBeenCalledTimes(count);
  });

  it('switches columns and number/date displays but leaves raw data untouched', () => {
    const before = JSON.stringify(row);
    const view = render(
      <Labels locale="en">
        <Calls />
      </Labels>,
    );
    expect(screen.getByRole('columnheader', { name: 'Cost (VND)' })).toBeTruthy();
    expect(screen.getByText('12,345')).toBeTruthy();
    expect(screen.getByText('1,234 / 24')).toBeTruthy();
    expect(screen.getByText('11/11/2026, 00:00:00')).toBeTruthy();
    for (const raw of ['owner-model-123', 'RAW_ERROR_123', 'OpenAI', 'Admin raw-actor-id'])
      expect(screen.getByText(raw)).toBeTruthy();
    view.rerender(
      <Labels locale="vi">
        <Calls />
      </Labels>,
    );
    expect(screen.getByRole('columnheader', { name: 'Chi phí (đ)' })).toBeTruthy();
    expect(screen.getByText('12.345')).toBeTruthy();
    expect(
      screen.getByText(new Date(row.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })),
    ).toBeTruthy();
    expect(screen.getByText('Quản trị raw-actor-id')).toBeTruthy();
    expect(JSON.stringify(row)).toBe(before);
  });
});
