/** Icon tròn của 6 dịch vụ V4 (§23.5) — màu nền/nét theo id, id lạ dùng mặc định */

interface Glyph {
  bg: string;
  fg: string;
  d: string;
  /** Nét (stroke) thay vì tô (fill) */
  line?: boolean;
}

const GLYPHS: Record<string, Glyph> = {
  comm: {
    bg: '#E6FFFB',
    fg: '#13C2C2',
    d: 'M9 11a4 4 0 100-8 4 4 0 000 8zM1.5 21v-.5A6.5 6.5 0 018 14h2a6.5 6.5 0 016.5 6.5v.5zM17 11a3 3 0 100-6 3 3 0 000 6zM18.5 14a5 5 0 015 5v2h-5.2v-.5a8 8 0 00-2.4-5.8 5 5 0 012.6-.7z',
  },
  train: {
    bg: '#E6F4FF',
    fg: '#1677FF',
    d: 'M12 3L.5 9 12 15l9.5-5V16h2V9zM5 12.6v4.2C6.6 18.9 9.2 20 12 20s5.4-1.1 7-3.2v-4.2l-7 3.7z',
  },
  org: {
    bg: '#F4EEFF',
    fg: '#722ED1',
    d: 'M3 21V3.5A1.5 1.5 0 014.5 2h9A1.5 1.5 0 0115 3.5V21zM6 5.5h2.5V8H6zM10 5.5h2.5V8H10zM6 10h2.5v2.5H6zM10 10h2.5v2.5H10zM6 14.5h2.5V17H6zM10 14.5h2.5V17H10zM16 21V8h3.5A1.5 1.5 0 0121 9.5V21zM17.5 11h2v2h-2zM17.5 15h2v2h-2zM2 21h20v1.5H2z',
  },
  tools: {
    bg: '#EDFBEF',
    fg: '#52C41A',
    d: 'M12 1.5l9.5 5.2L12 12 2.5 6.7zM2 8.4l9 5v9.4l-9-5zM13 13.4l9-5v9.4l-9 5z',
  },
  event: {
    bg: '#FFF4E6',
    fg: '#FA8C16',
    d: 'M7 1.5h2V4h6V1.5h2V4h2.5A2.5 2.5 0 0122 6.5V9H2V6.5A2.5 2.5 0 014.5 4H7zM2 10.5h20v9A2.5 2.5 0 0119.5 22h-15A2.5 2.5 0 012 19.5zM5.5 13v2.2h2.2V13zM10.9 13v2.2h2.2V13zM16.3 13v2.2h2.2V13zM5.5 17.2v2.2h2.2v-2.2zM10.9 17.2v2.2h2.2v-2.2z',
  },
  b2b: {
    bg: '#FFEEF0',
    fg: '#F5222D',
    line: true,
    d: 'M11 17l2 2a1 1 0 003-3M14 14l2.5 2.5a1 1 0 003-3l-3.9-3.9a2 2 0 00-2.8 0l-.9.9a1 1 0 01-3-3l2.8-2.8a5 5 0 016 .8L21 8M3 8l5.2-5.2a2 2 0 012.8 0l.6.6M3 8l4 4M3 8v6l5 5',
  },
};
const FALLBACK: Glyph = { bg: '#E6F4FF', fg: '#1677FF', line: true, d: 'M4 6h16M4 12h16M4 18h10' };

export function ServiceIcon({ id, className }: { id: string; className?: string | undefined }) {
  const g = GLYPHS[id] ?? FALLBACK;
  return (
    <span className={className} style={{ background: g.bg, color: g.fg }} aria-hidden="true">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill={g.line ? 'none' : 'currentColor'}
        stroke={g.line ? 'currentColor' : 'none'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={g.d} />
      </svg>
    </span>
  );
}
