import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import type { WelcomeMail } from '@opchub/shared/api-domains';
import en from '../../../../messages/en/settings/mail.json';
import { WelcomePreview } from './welcome-preview';

afterEach(cleanup);

describe('D-141 AC824-12 settings email preview content boundary', () => {
  it('translates preview chrome, not email copy or authored content', () => {
    const mail: WelcomeMail = {
      subject: 'Tiêu đề riêng',
      intro: 'Lời chào riêng',
      loginUrl: 'https://example.test/login',
      guideUrl: 'https://example.test/guide',
      showAccess: true,
      showRules: true,
      rules: ['Nội quy riêng'],
      showGuide: true,
      attachments: [{ title: 'Tài liệu riêng', url: 'https://example.test/file' }],
    };
    render(
      <NextIntlClientProvider locale="en" messages={{ settings: en }}>
        <WelcomePreview mail={mail} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Preview')).toBeTruthy();
    for (const raw of [
      'Chào mừng Nguyễn Văn A!',
      'Đăng nhập ngay',
      'Lời chào riêng',
      'Nội quy riêng',
      'Tài liệu riêng',
    ])
      expect(screen.getByText(raw)).toBeTruthy();
    expect(screen.queryByText('Sign in now')).toBeNull();
  });
});
