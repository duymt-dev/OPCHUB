import type { ThemeConfig } from 'antd';
import { colors, FONT_FAMILY, shadows } from './tokens';

/** Theme Ant Design khớp prototype (control 40px, bo 6px, chữ 14px) */
export const opchubTheme: ThemeConfig = {
  hashed: false,
  token: {
    colorPrimary: colors.primary,
    colorLink: colors.primary,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textTertiary,
    colorTextPlaceholder: colors.placeholder,
    colorBorder: colors.border,
    colorBorderSecondary: colors.borderSecondary,
    colorBgLayout: colors.pageBg,
    colorSuccess: colors.success,
    colorError: colors.error,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    borderRadius: 6,
    borderRadiusLG: 8,
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 42,
    boxShadowSecondary: shadows.popover,
    motion: true,
  },
  components: {
    Button: {
      fontWeight: 500,
      primaryShadow: shadows.button,
      contentFontSizeLG: 15,
    },
    Input: {
      paddingInline: 12,
      activeShadow: '0 0 0 2px rgba(5,145,255,0.1)',
    },
    Checkbox: {
      borderRadiusSM: 3,
    },
    Layout: {
      bodyBg: colors.pageBg,
      siderBg: '#fff',
      headerBg: '#fff',
    },
  },
};
