import { adminRoleSchema } from '@opchub/shared/api-domains';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import settings from '../../../../messages/vi/settings.json';
import { RoleMatrixTable } from './role-matrix';

afterEach(cleanup);
const roles = ['super_admin', 'admin', 'accountant'].map((key) =>
  adminRoleSchema.parse({
    id: key,
    key,
    name: key,
    description: '',
    isSystem: true,
    accountCount: 1,
    permissions: key === 'admin' ? ['affiliate.gdv'] : [],
  }),
);
const label = 'Bổ nhiệm / thu hồi GĐ Vùng (miễn phí thành viên)';
const matrix = Object.fromEntries(roles.map((role) => [role.id, role.permissions]));
function show(canEdit: boolean) {
  const onToggle = vi.fn();
  render(
    <NextIntlClientProvider locale="vi" messages={{ settings }}>
      <RoleMatrixTable roles={roles} matrix={matrix} canEdit={canEdit} onToggle={onToggle} />
    </NextIntlClientProvider>,
  );
  return onToggle;
}

it('REQ-616 P17 renders the director permission and locks implicit Super Admin grants', () => {
  const toggle = show(true);
  const sa = screen.getByRole('checkbox', { name: `${label} — super_admin` });
  const admin = screen.getByRole('checkbox', { name: `${label} — admin` });
  const accountant = screen.getByRole('checkbox', { name: `${label} — accountant` });
  expect(sa.getAttribute('aria-checked')).toBe('true');
  expect(sa.getAttribute('aria-disabled')).toBe('true');
  expect(admin.getAttribute('aria-checked')).toBe('true');
  expect(accountant.getAttribute('aria-checked')).toBe('false');
  fireEvent.click(sa);
  expect(toggle).not.toHaveBeenCalled();
  fireEvent.click(admin);
  expect(toggle).toHaveBeenCalledWith('admin', 'affiliate.gdv');
});

it('REQ-616 P17 readonly permission matrix cannot dispatch any toggle even on direct clicks', () => {
  const toggle = show(false);
  for (const checkbox of screen.getAllByRole('checkbox')) {
    expect(checkbox.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(checkbox);
  }
  expect(toggle).not.toHaveBeenCalled();
});
