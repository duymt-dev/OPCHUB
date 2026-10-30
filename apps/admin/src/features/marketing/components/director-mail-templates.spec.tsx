import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import marketing from '../../../../messages/vi/marketing.json';
import { DirectorMailTemplates } from './director-mail-templates';

afterEach(cleanup);

it('REQ-616 BR-464 exposes EM-GDV1/2 as readonly system mail, not campaign editors', () => {
  render(
    <NextIntlClientProvider locale="vi" messages={{ marketing }}>
      <DirectorMailTemplates />
    </NextIntlClientProvider>,
  );
  const table = screen.getByRole('table', { name: 'Email hệ thống · GĐ Vùng' });
  const rows = within(table).getAllByRole('row');
  expect(rows).toHaveLength(2);
  expect(within(table).getByText('EM-GDV1').closest('[role="row"]')).toBe(rows[0]);
  expect(within(table).getByText('EM-GDV2').closest('[role="row"]')).toBe(rows[1]);
  expect(within(table).getAllByText('Đang bật')).toHaveLength(2);
  expect(within(table).getByText(/Bạn được bổ nhiệm GĐ Vùng \{vùng\}/)).toBeTruthy();
  expect(within(table).getByText(/Kết thúc vai trò GĐ Vùng \{vùng\}/)).toBeTruthy();
  expect(screen.getByText(/Không gửi mật khẩu/)).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByRole('checkbox')).toBeNull();
});
