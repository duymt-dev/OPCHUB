/** Icon của cột gói thành viên V4 (cùng bộ nét với prototype §23.5) */

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const PEOPLE =
  'M9 11a4 4 0 100-8 4 4 0 000 8zM1.5 21v-.5A6.5 6.5 0 018 14h2a6.5 6.5 0 016.5 6.5v.5zM17 11a3 3 0 100-6 3 3 0 000 6zM18.5 14a5 5 0 015 5v2h-5.2v-.5a8 8 0 00-2.4-5.8 5 5 0 012.6-.7z';
const BOOK =
  'M2 4.6C4.6 3.4 8.2 3.5 11 5.5V20.5c-2.8-1.9-6.4-2-9-.9zM22 4.6c-2.6-1.2-6.2-1.1-9 .9v15c2.8-1.9 6.4-2 9-.9z';
const HANDSHAKE =
  'M11 17l2 2a1 1 0 003-3M14 14l2.5 2.5a1 1 0 003-3l-3.9-3.9a2 2 0 00-2.8 0l-.9.9a1 1 0 01-3-3l2.8-2.8a5 5 0 016 .8L21 8M3 8l5.2-5.2a2 2 0 012.8 0l.6.6M3 8l4 4M3 8v6l5 5';

/** 3 lợi ích đầu cột: Cộng đồng · Kiến thức · Hợp tác */
export const PerkIcon = ({ i }: { i: 0 | 1 | 2 }) =>
  i === 2 ? (
    <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="2.3" {...line}>
      <path d={HANDSHAKE} />
    </svg>
  ) : (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill={i === 0 ? '#1677FF' : '#52C41A'}
      fillRule="evenodd"
      aria-hidden="true"
    >
      <path d={i === 0 ? PEOPLE : BOOK} />
    </svg>
  );

export const PlanBadge = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
    <path d={PEOPLE} />
  </svg>
);

export const Check = ({ color = '#1677FF' }: { color?: string | undefined }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill={color} />
    <path
      d="M7.5 12.5l3 3 6-6"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 5 ô tính năng: Chat · Sự kiện · Dự án · Thư viện · Đối tác */
const TILE = [
  'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2zM8 10h.01M12 10h.01M16 10h.01',
  'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01',
  'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18',
  'M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z',
  'M12 8a3 3 0 100-6 3 3 0 000 6zM5 21a3 3 0 100-6 3 3 0 000 6zM19 21a3 3 0 100-6 3 3 0 000 6zM12 8v4M12 12l-5 3M12 12l5 3',
] as const;

export const TileIcon = ({ i }: { i: number }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.8" {...line}>
    <path d={TILE[i] ?? TILE[0]} />
  </svg>
);

/** 3 cam kết cuối cột: an toàn · gia hạn · hỗ trợ */
export const PromiseIcon = ({ i }: { i: number }) => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 24 24"
    strokeWidth="1.6"
    {...line}
    stroke="rgba(0,0,0,0.5)"
  >
    {i === 1 ? (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </>
    ) : (
      <path
        d={
          i === 0
            ? 'M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6zM9 12l2 2 4-4'
            : 'M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-1v-6h3zM3 19a2 2 0 002 2h1v-6H3z'
        }
      />
    )}
  </svg>
);
