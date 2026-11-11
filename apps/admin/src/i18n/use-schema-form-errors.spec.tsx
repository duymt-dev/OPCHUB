import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Form, Input } from 'antd';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import source from '../../messages/vi/ui.json';
import english from '../../messages/en/ui.json';
import { useSchemaFormErrors } from './use-schema-form-errors';

afterEach(cleanup);
const FIELDS = ['count'] as const;
const schema = z.object({ count: z.number().max(1000) });
function context() {
  const current = { locale: 'vi' };
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale={current.locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ ui: current.locale === 'vi' ? source : english }}
      >
        {children}
      </NextIntlClientProvider>
    );
  }
  function useTestForm() {
    const [form] = Form.useForm<{ count: number; hidden?: string }>();
    return { form, errors: useSchemaFormErrors(form, FIELDS) };
  }
  let latest: ReturnType<typeof useTestForm>;
  function Harness() {
    latest = useTestForm();
    return (
      <Form form={latest.form} component={false} initialValues={{ count: 1001 }}>
        <Form.Item name="count" noStyle>
          <Input />
        </Form.Item>
      </Form>
    );
  }
  const view = render(<Harness />, { wrapper: Wrapper });
  return {
    result: {
      get current() {
        return latest;
      },
    },
    current,
    rerender: () => view.rerender(<Harness />),
  };
}
function invalid() {
  const result = schema.safeParse({ count: 1001 });
  if (result.success) throw new Error('Invalid fixture');
  return result.error;
}

it('re-renders local structured issues with locale-formatted bounds and retains the draft', () => {
  const h = context();
  act(() => h.result.current.errors.local(invalid()));
  expect(h.result.current.form.getFieldError('count')).toEqual(['Giá trị tối đa 1.000']);
  h.current.locale = 'en';
  h.rerender();
  expect(h.result.current.form.getFieldError('count')).toEqual(['Maximum value: 1,000']);
  expect(h.result.current.form.getFieldValue('count')).toBe(1001);
});

it('keeps API text raw even when identical to a local translation and ignores unregistered fields', () => {
  const h = context();
  act(() =>
    h.result.current.errors.raw({ count: 'Giá trị tối đa 1.000', hidden: 'Do not register' }),
  );
  h.current.locale = 'en';
  h.rerender();
  expect(h.result.current.form.getFieldError('count')).toEqual(['Giá trị tối đa 1.000']);
  expect(h.result.current.form.getFieldError('hidden')).toEqual([]);
});

it('does not resurrect cleared local errors on a later locale change', () => {
  const h = context();
  act(() => h.result.current.errors.local(invalid()));
  act(() => h.result.current.form.setFields([{ name: 'count', errors: [] }]));
  h.current.locale = 'en';
  h.rerender();
  expect(h.result.current.form.getFieldError('count')).toEqual([]);
});

it('revalidates only active current-value errors, without applying stale schema issues', async () => {
  const h = context();
  const validate = vi
    .spyOn(h.result.current.form, 'validateFields')
    .mockResolvedValue({ count: 9 });
  act(() => h.result.current.errors.local(invalid()));
  act(() =>
    h.result.current.form.setFields([{ name: 'count', value: 9, errors: ['Old client error'] }]),
  );
  h.current.locale = 'en';
  h.rerender();
  await waitFor(() => expect(validate).toHaveBeenCalledWith(['count']));
  expect(h.result.current.form.getFieldValue('count')).toBe(9);
  expect(h.result.current.form.getFieldError('count')).not.toContain('Maximum value: 1,000');
});
