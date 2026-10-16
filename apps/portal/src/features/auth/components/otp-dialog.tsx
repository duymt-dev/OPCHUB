'use client';

import { OtpModal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { useOtpFlow } from '../hooks/use-otp-flow';

const KEYS = [
  'title',
  'descLead',
  'descTail',
  'close',
  'codeLabel',
  'submit',
  'noCode',
  'resend',
] as const;

/** A-21 → A-23: hộp nhập OTP nối với useOtpFlow */
export function OtpDialog({ flow }: { flow: ReturnType<typeof useOtpFlow> }) {
  const t = useTranslations('auth.otp');
  const labels = Object.fromEntries(KEYS.map((k) => [k, t(k)])) as Record<
    (typeof KEYS)[number],
    string
  >;
  return (
    <OtpModal
      open={Boolean(flow.email)}
      email={flow.email ?? ''}
      code={flow.code}
      error={flow.error}
      labels={labels}
      onCode={flow.setCode}
      onSubmit={() => void flow.submit()}
      onResend={() => void flow.resend()}
      onClose={flow.close}
    />
  );
}
