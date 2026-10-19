import type { ProjectDetail } from '@opchub/shared/api-domains';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import projects from '../../../../messages/vi/projects.json';
import { Contacts, OwnerContactActions } from './detail-contact';

const withContact = (contact: ProjectDetail['contact']) => ({ contact }) as ProjectDetail;
const ui = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ projects }}>
      {node}
    </NextIntlClientProvider>,
  );

describe('BUG-016 BUG-021 QT-09 thẻ liên hệ chủ dự án', () => {
  it('có SĐT → Zalo + Gọi, không có Nhắn tin', () => {
    ui(<OwnerContactActions p={withContact({ email: null, phone: '0912345678' })} />);
    expect(screen.getByRole('link', { name: 'Zalo' }).getAttribute('href')).toBe(
      'https://zalo.me/0912345678',
    );
    expect(screen.getByRole('link', { name: 'Gọi' }).getAttribute('href')).toBe('tel:0912345678');
    expect(screen.queryByRole('link', { name: 'Email' })).toBeNull();
    expect(screen.queryByText('Nhắn tin')).toBeNull();
  });

  it('không kênh nào → "chưa công khai", dải liên hệ ẩn, không có địa chỉ', () => {
    const p = withContact({ email: null, phone: null });
    const { container } = ui(
      <>
        <OwnerContactActions p={p} />
        <Contacts p={p} />
      </>,
    );
    expect(screen.getByText('Chủ dự án chưa công khai thông tin liên hệ')).toBeTruthy();
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(screen.queryByText('Địa chỉ')).toBeNull();
  });
});
