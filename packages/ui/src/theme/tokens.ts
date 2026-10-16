/**
 * Giá trị đo trực tiếp từ prototype docs/spec/index.html (getComputedStyle).
 * Đổi ở đây là đổi toàn hệ thống — không hardcode màu ngoài file này.
 */
export const FONT_FAMILY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Noto Sans Thai','Noto Sans Khmer','Noto Sans Lao','Noto Sans Myanmar','Noto Sans SC',sans-serif";

export const MONO_FAMILY = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

export const colors = {
  primary: '#1677FF',
  primaryHover: '#4096FF',
  primaryBg: '#E6F4FF',
  primaryBorder: '#91CAFF',
  navy: '#0B1F4D',
  text: 'rgba(0,0,0,0.88)',
  textBody: '#14171F',
  textSecondary: 'rgba(0,0,0,0.65)',
  textTertiary: 'rgba(0,0,0,0.45)',
  textQuaternary: 'rgba(0,0,0,0.25)',
  border: '#D9D9D9',
  borderSecondary: '#F0F0F0',
  authPanelBg: '#F3F8FF',
  authPanelBorder: '#E6EEF9',
  pageBg: '#F5F5F5',
  fillQuaternary: 'rgba(0,0,0,0.04)',
  success: '#52C41A',
  error: '#FF4D4F',
  purple: '#722ED1',
  purpleBg: '#F9F0FF',
} as const;

export const shadows = {
  popover:
    '0 6px 16px 0 rgba(0,0,0,0.08),0 3px 6px -4px rgba(0,0,0,0.12),0 9px 28px 8px rgba(0,0,0,0.05)',
  button: '0 2px 0 rgba(5,145,255,0.1)',
} as const;

export const tones = {
  blue: { bg: '#E6F4FF', bd: '#91CAFF', fg: '#1677FF' },
  rose: { bg: '#FFF2F0', bd: '#FFCCC7', fg: '#FF4D4F' },
  green: { bg: '#F6FFED', bd: '#B7EB8F', fg: '#52C41A' },
  amber: { bg: '#FFFBE6', bd: '#FFE58F', fg: '#FAAD14' },
  violet: { bg: '#F9F0FF', bd: '#D3ADF7', fg: '#722ED1' },
} as const;

export type ToneName = keyof typeof tones;
