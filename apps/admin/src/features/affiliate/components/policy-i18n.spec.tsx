import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Form, Input } from 'antd';
import { afterEach, expect, it, vi } from 'vitest';
import { affiliatePolicySchema } from '@opchub/shared/api-domains';
import { domainContext } from '@/i18n/tests/domain-context';
import { ApiError } from '@/lib/api-client';
import { useAffiliatePolicyForm } from '../hooks/use-affiliate-policy-form';

const state = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../hooks/use-affiliate-writes', () => ({
  useAffiliateWrites: () => ({ policy: { mutate: state.mutate } }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const policy = affiliatePolicySchema.parse({
  defaultRate: 20,
  fundraisingRate: 10,
  cookieDays: 30,
  terms: 'raw draft',
});
function context() {
  const c = domainContext();
  let current: ReturnType<typeof useAffiliatePolicyForm>;
  function Harness() {
    current = useAffiliatePolicyForm();
    return (
      <Form component={false} form={current.form} initialValues={policy}>
        <Form.Item name="cookieDays" noStyle>
          <Input />
        </Form.Item>
        <Form.Item name="terms" noStyle>
          <Input />
        </Form.Item>
      </Form>
    );
  }
  const view = render(<Harness />, c);
  return {
    c,
    get hook() {
      return current;
    },
    rerender: () => view.rerender(<Harness />),
  };
}
it('D-141 AC824-10 policy numeric schema errors change language without saving or changing the draft', () => {
  const h = context();
  act(() => h.hook.form.setFieldValue('cookieDays', 366));
  act(() => h.hook.submit({ ...policy, cookieDays: 366 }));
  expect(h.hook.form.getFieldError('cookieDays')).toEqual(['Giá trị tối đa 365']);
  h.c.current.locale = 'en';
  h.rerender();
  expect(h.hook.form.getFieldError('cookieDays')).toEqual(['Maximum value: 365']);
  expect(h.hook.form.getFieldValue('terms')).toBe('raw draft');
  expect(h.hook.form.getFieldValue('cookieDays')).toBe(366);
  expect(state.mutate).not.toHaveBeenCalled();
});
it('D-141 AC824-12 policy server fields remain raw and hidden legacy fields are not injected', async () => {
  state.mutate.mockImplementation(
    (_value: unknown, options: { onError: (error: Error) => void }) => {
      options.onError(
        new ApiError('VALIDATION_ERROR', 422, 'raw', [
          { path: 'cookieDays', message: 'Giá trị tối đa 365' },
          { path: 'renewalRate', message: 'Hidden server text' },
        ]),
      );
    },
  );
  const h = context();
  act(() => h.hook.submit(policy));
  await waitFor(() => expect(state.mutate).toHaveBeenCalledWith(policy, expect.any(Object)));
  h.c.current.locale = 'en';
  h.rerender();
  expect(h.hook.form.getFieldError('cookieDays')).toEqual(['Giá trị tối đa 365']);
  expect(h.hook.form.getFieldError('renewalRate')).toEqual([]);
});
