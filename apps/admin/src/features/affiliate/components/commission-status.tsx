'use client';

import { StatusTag } from '@opchub/ui';
import { Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

const TONES = {
  recorded: 'blue',
  paid: 'green',
  cancelled: 'rose',
  active: 'green',
  paused: 'amber',
  mixed: 'amber',
  pending: 'neutral',
  void: 'neutral',
} as const;
type Status = keyof typeof TONES;
const isStatus = (value: string): value is Status => Object.hasOwn(TONES, value);

export function CommissionStatus({ status, reason }: { status: string; reason?: string | null }) {
  const t = useTranslations('affiliate.status');
  if (!isStatus(status)) return <span>—</span>;
  const tag = (
    <StatusTag tone={TONES[status]} lineHeight={22}>
      {t(status)}
    </StatusTag>
  );
  return reason ? (
    <Tooltip title={reason}>
      <span aria-label={`${t(status)}: ${reason}`}>{tag}</span>
    </Tooltip>
  ) : (
    tag
  );
}
