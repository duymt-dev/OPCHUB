import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { WelcomeMail } from '@opchub/shared/api-domains';
import { afterEach, describe, expect, it } from 'vitest';
import english from '../../../../messages/en/marketing.json';
import { WelcomePreview } from './welcome-preview';

afterEach(cleanup);

describe('D-141 AC824-12 email preview is not translated with Admin chrome', () => {
  it('keeps fixed email copy, authored text and attachment names raw under English', () => {
    const tpl: WelcomeMail = {
      subject: 'Tiêu đề riêng',
      intro: 'Nội dung riêng không dịch',
      loginUrl: 'https://example.test/login',
      guideUrl: 'https://example.test/guide',
      showAccess: true,
      showRules: true,
      rules: ['Nội quy do Admin soạn'],
      showGuide: true,
      attachments: [{ title: 'Tài liệu của tôi', url: 'https://example.test/guide' }],
    };
    render(
      <NextIntlClientProvider
        locale="en"
        messages={{ marketing: english }}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <WelcomePreview tpl={tpl} name="Nguyễn Văn An" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Chào mừng Nguyễn Văn An!')).toBeTruthy();
    expect(screen.getByText('Đăng nhập ngay')).toBeTruthy();
    expect(screen.getByText('Quy định hoạt động trên nền tảng')).toBeTruthy();
    expect(screen.getByText(tpl.intro)).toBeTruthy();
    expect(screen.getByText('Nội quy do Admin soạn')).toBeTruthy();
    expect(screen.getByText('Tài liệu của tôi')).toBeTruthy();
    expect(screen.queryByText('Sign in now')).toBeNull();
  });
});
