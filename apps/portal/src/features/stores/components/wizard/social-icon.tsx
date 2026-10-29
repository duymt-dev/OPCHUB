import type { StoreSocialKey } from '@opchub/shared/api-domains';
import s from './steps.module.css';

/** Màu + icon mạng xã hội (prototype `_socList`, index.html :6151) */
export const SOCIALS: Record<StoreSocialKey, { c: string; d: string }> = {
  zalo: { c: '#0068FF', d: '' },
  fb: { c: '#1877F2', d: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
  web: {
    c: '#595959',
    d: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
  },
  yt: {
    c: '#FF0000',
    d: 'M2.5 17a24 24 0 010-10 2 2 0 011.4-1.4 49.6 49.6 0 0116.2 0A2 2 0 0121.5 7a24 24 0 010 10 2 2 0 01-1.4 1.4 49.6 49.6 0 01-16.2 0A2 2 0 012.5 17M10 15l5-3-5-3z',
  },
  tt: { c: '#141414', d: 'M9 12a4 4 0 104 4V4a5 5 0 005 5' },
  li: {
    c: '#0A66C2',
    d: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z',
  },
};

/** Ô màu: vuông 40px trong ô nhập (trình tạo) / tròn 28 · 34px (xem trước, chi tiết) */
export function SocialIcon({
  k,
  size,
  square,
}: {
  k: StoreSocialKey;
  size: number;
  square?: boolean;
}) {
  const o = SOCIALS[k];
  const icon = Math.round(size * (square ? 0.4 : 0.5));
  return (
    <span
      className={square ? s.socIconSq : s.socIcon}
      style={{ background: o.c, width: size, height: square ? '100%' : size }}
    >
      {k === 'zalo' ? (
        <b className={s.zalo} style={{ fontSize: square ? 10 : Math.round(size * 0.29) }}>
          Zalo
        </b>
      ) : (
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={o.d} />
        </svg>
      )}
    </span>
  );
}
