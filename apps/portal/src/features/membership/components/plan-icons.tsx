/** Icon nét của cột gói thành viên (cùng bộ với prototype) */

const svg = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export const Crown = () => (
  <svg width="34" height="27" viewBox="0 0 40 32" stroke="#D48806" strokeWidth="2.4" {...svg}>
    <path d="M4 8l8 8 8-12 8 12 8-8-3 16H7z" />
    <path d="M7 29h26" />
  </svg>
);

export const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" stroke="#52C41A" strokeWidth="2.4" {...svg}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);

export const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" {...svg}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const Shield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" {...svg}>
    <path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z" />
  </svg>
);
