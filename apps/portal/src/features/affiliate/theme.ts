'use client';

import { colors } from '@opchub/ui';
import { theme } from 'antd';
import type { CSSProperties } from 'react';

export function useAffiliateTheme(): CSSProperties {
  const { token: t } = theme.useToken();
  return {
    '--af-navy': colors.affiliateNavy,
    '--af-facebook': colors.facebook,
    '--af-zalo': colors.zalo,
    '--af-primary': t.colorPrimary,
    '--af-primary-border': t.colorPrimaryBorder,
    '--af-primary-bg': t.colorPrimaryBg,
    '--af-white': t.colorWhite,
    '--af-bg': t.colorBgContainer,
    '--af-fill': t.colorFillAlter,
    '--af-text': t.colorText,
    '--af-muted': t.colorTextTertiary,
    '--af-border': t.colorBorder,
    '--af-line': t.colorBorderSecondary,
    '--af-success': t.colorSuccessText,
    '--af-warning': t.colorWarningText,
    '--af-warning-bg': t.colorWarningBg,
    '--af-warning-border': t.colorWarningBorder,
    '--af-error': t.colorError,
    '--af-blue': t.colorPrimaryBorderHover,
  } as CSSProperties;
}
