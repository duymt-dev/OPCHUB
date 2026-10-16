import type { ReactElement } from 'react';

type SsoId = 'google' | 'facebook' | 'linkedin' | 'chatgpt' | 'gemini' | 'deepseek';

const ROT = [0, 60, 120, 180, 240, 300];

const ICONS: Record<SsoId, () => ReactElement> = {
  google: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"
        fill="#EA4335"
      />
      <path
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"
        fill="#4285F4"
      />
      <path
        d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"
        fill="#FBBC05"
      />
      <path
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
        fill="#34A853"
      />
    </svg>
  ),
  facebook: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M15.1 12.6l.4-2.9h-2.8V7.9c0-.8.4-1.6 1.6-1.6h1.3V3.8s-1.1-.2-2.2-.2c-2.3 0-3.8 1.4-3.8 3.9v2.2H7.1v2.9h2.5V24h3.1V12.6h2.4z"
        fill="#fff"
      />
    </svg>
  ),
  linkedin: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        d="M5.3 9.2h2.9V19H5.3zM6.8 4.6a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zM10 9.2h2.8v1.3h.1c.4-.7 1.4-1.6 2.9-1.6 3.1 0 3.6 2 3.6 4.6V19h-2.9v-4.8c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V19H10z"
        fill="#fff"
      />
    </svg>
  ),
  chatgpt: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width="24" height="24" rx="6" fill="#000" />
      {ROT.map((a) => (
        <rect
          key={a}
          x="9.6"
          y="4.2"
          width="4.8"
          height="9"
          rx="2.4"
          fill="none"
          stroke="#fff"
          strokeWidth="1.3"
          transform={`rotate(${a} 12 12)`}
        />
      ))}
    </svg>
  ),
  gemini: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id="gemG" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1C7DFF" />
          <stop offset=".5" stopColor="#8E75FF" />
          <stop offset="1" stopColor="#E36BB0" />
        </linearGradient>
      </defs>
      <path
        d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z"
        fill="url(#gemG)"
      />
    </svg>
  ),
  deepseek: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width="24" height="24" rx="6" fill="#4D6BFE" />
      <path
        d="M19.6 8.3c-.4-.2-.6.2-.8.4l-.2.2c-.6.6-1.3 1-2.2 1-1.3-.1-2.4.3-3.4 1.3-.2-1.2-.9-1.9-1.9-2.4-.5-.2-1.1-.5-1.4-1-.3-.4-.4-.8-.5-1.2 0-.3-.1-.5-.4-.6-.3 0-.4.2-.5.4-.4.8-.6 1.7-.5 2.6.1 2 .9 3.5 2.6 4.6.2.1.2.3.2.5-.1.4-.3.6-.4 1-.1.2-.2.3-.4.2-.9-.4-1.7-.9-2.4-1.6-1.2-1.1-2.2-2.4-3.6-3.3-.3-.2-.6-.4-1-.5-1.2-.4.2-.5.5-.4l1.7.7-.1-.4c.3.1.9.3 1.1.6 1.1 1.1 2 2.3 3.2 3.4 1.2 1 2.4 1.8 3.9 2.1 2.6.6 4.9.1 6.6-2.1 1-1.3 1.3-2.8 1.2-4.4 0-.4 0-.7-.4-.9zM14 16.4c-1.4-1.1-2.1-1.4-2.3-1.4-.3 0-.2.3-.2.5.1.2.2.4.4.6.1.2.1.4-.1.5-.5.3-1.4-.1-1.4-.1-1-.6-1.8-1.3-2.5-2.2-.6-.6-1-1.3-1.2-2.1 0-.1 0-.2.2-.3.8-.2 1.6 0 2.3.4 1.1.6 2 1.4 2.8 2.4.8 1 1.6 2 2.6 2.7-.2.1-.4 0-.6-.1z"
        fill="#fff"
      />
    </svg>
  ),
};

export function SsoIcon({ id }: { id: string }) {
  const render = ICONS[id as SsoId];
  return render ? render() : null;
}
