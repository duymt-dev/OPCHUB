import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { ADMIN_MENUS, ADMIN_PERMISSIONS } from '@opchub/shared';
import { messages } from './messages';
import enUi from '../../messages/en/ui.json';
import enOptions from '../../messages/en/bot-options.json';
import { useDomainLabels } from './domain-labels';
import { useBotOptionLabels } from '@/features/bots/option-labels';
import { useRejectionLabels } from '@/features/projects/rejection-labels';

afterEach(cleanup);

const wrapper =
  (locale: string) =>
  ({ children }: { children: ReactNode }) =>
    createElement(NextIntlClientProvider, {
      locale,
      timeZone: 'Asia/Ho_Chi_Minh',
      messages: {
        ...messages,
        ui: locale === 'en' ? enUi : messages.ui,
        botOptions: locale === 'en' ? enOptions : messages.botOptions,
      },
      children,
    });

describe('D-141 AC824-11 stable domain values and localized labels', () => {
  it('keeps every existing Vietnamese menu/permission label exactly equal to its canonical registry', () => {
    const { result } = renderHook(useDomainLabels, { wrapper: wrapper('vi') });
    for (const permission of ADMIN_PERMISSIONS)
      expect(result.current.permission(permission.key)).toBe(permission.label);
    for (const menu of ADMIN_MENUS) expect(result.current.menu(menu.key)).toBe(menu.label);
    expect(result.current.region('central', true)).toBe('Miền Trung & Tây Nguyên');
    expect(result.current.region('central')).toBe('Miền Trung');
  });

  it('renders English domain labels while preserving custom data and canonical region identity', () => {
    const { result } = renderHook(useDomainLabels, { wrapper: wrapper('en') });
    expect(result.current.permission('members.action')).toBe(
      'Lock / unlock, assign groups, export data',
    );
    expect(result.current.canonicalRegion('Miền Bắc')).toBe('Northern');
    expect(result.current.canonicalRegion('Custom Province')).toBe('Custom Province');
  });

  it('changes bot preset display text but not any gender/tone/hour/script value sent to the API', () => {
    const vi = renderHook(useBotOptionLabels, { wrapper: wrapper('vi') }).result.current;
    const en = renderHook(useBotOptionLabels, { wrapper: wrapper('en') }).result.current;
    for (const key of ['tones', 'genders', 'hours', 'ages', 'scriptTypes'] as const) {
      expect(en[key].map((option) => option.value)).toEqual(vi[key].map((option) => option.value));
    }
    expect(en.tones[0]).toEqual({
      value: 'Thân thiện, hay hỏi',
      label: 'Friendly and inquisitive',
    });
    expect(en.scriptTypes[0]).toEqual({ value: 'Hỏi đáp', label: 'Questions & answers' });
    expect(en.tone('Thân thiện, hay hỏi')).toBe('Friendly and inquisitive');
    expect(en.activeHour('Cả ngày')).toBe('All day');
    expect(en.tone('Custom tone')).toBe('Custom tone');
    expect(en.activeHour('Custom schedule')).toBe('Custom schedule');
  });

  it('D-141 AC824-08/11 localizes known age digits without changing the canonical selection', () => {
    // Numeric projection fixture only; not a claim that the Myanmar catalog exists.
    const { result } = renderHook(useBotOptionLabels, { wrapper: wrapper('my') });
    expect(result.current.ages[0]).toEqual({ value: '18 – 24', label: '၁၈ – ၂၄' });
    expect(result.current.ages.at(-1)).toEqual({ value: '55+', label: '၅၅+' });
  });

  it('keeps submitted rejection reasons unchanged while translating their visible text', () => {
    const { result } = renderHook(useRejectionLabels, { wrapper: wrapper('en') });
    expect(result.current[0]).toEqual({
      value: 'Thiếu thông tin mô tả',
      label: 'Description is incomplete',
    });
  });
});
