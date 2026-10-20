import type { ReactNode } from 'react';
import { tones, type ToneName } from '../theme/tokens';

export type StatusTone = ToneName | 'neutral';

const NEUTRAL = { bg: '#FAFAFA', bd: '#D9D9D9', fg: 'rgba(0,0,0,0.65)' };

export interface StatusTagProps {
  tone: StatusTone;
  children: ReactNode;
  bordered?: boolean;
  /** 22px line box produces the prototype's 24px Affiliate badges including borders. */
  lineHeight?: 20 | 22;
}

/** Nhãn trạng thái 12px, nền/viền/chữ theo tone của prototype */
export function StatusTag({ tone, children, bordered = true, lineHeight = 20 }: StatusTagProps) {
  const t = tone === 'neutral' ? NEUTRAL : tones[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 12,
        lineHeight: `${lineHeight}px`,
        padding: '0 8px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
        background: t.bg,
        color: t.fg,
        border: bordered ? `1px solid ${t.bd}` : 'none',
      }}
    >
      {children}
    </span>
  );
}
