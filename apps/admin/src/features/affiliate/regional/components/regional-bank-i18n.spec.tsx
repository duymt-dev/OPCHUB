import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { domainContext } from '@/i18n/tests/domain-context';
import { setupAffiliateBrowser } from '../../tests/context';
import { RegionalBankFields } from './regional-bank-fields';

beforeAll(setupAffiliateBrowser);
afterEach(cleanup);
it('AC824-10 bank errors change live without submitting or normalizing the draft', async () => {
  const c = domainContext();
  const onSave = vi.fn();
  const element = (
    <RegionalBankFields
      bank={{ bankName: 'Bank', bankNo: '123456', bankHolder: 'NGUYEN AN' }}
      disabled={false}
      onSave={onSave}
    />
  );
  const view = render(element, c);
  fireEvent.change(screen.getByLabelText('Số tài khoản'), { target: { value: '12x' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Lưu' }));
  await screen.findByText('Số tài khoản gồm 6–20 chữ số');
  c.current.locale = 'en';
  view.rerender(element);
  await screen.findByText('The account number must contain 6–20 digits');
  expect(screen.getByLabelText<HTMLInputElement>('Account number').value).toBe('12x');
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '123 456' } });
  fireEvent.change(screen.getByLabelText('Account holder'), { target: { value: ' Đặng  An ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      bankName: 'Bank',
      bankNo: '123 456',
      bankHolder: 'DANG AN',
    }),
  );
});
