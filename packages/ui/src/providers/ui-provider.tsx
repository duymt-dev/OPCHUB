'use client';

import { App, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import type { ReactNode } from 'react';
import { opchubTheme } from '../theme';

dayjs.locale('vi');

/**
 * ConfigProvider + App (để dùng App.useApp() cho message/modal).
 * component={false}: không bọc div .ant-app (nó đặt line-height 1.57, prototype dùng normal).
 */
export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={opchubTheme} locale={viVN}>
      <App component={false} message={{ top: 0, maxCount: 1 }}>
        {children}
      </App>
    </ConfigProvider>
  );
}
