'use client';

import type { ReportScopes, ReportTemplate } from '@opchub/shared/api-domains';
import { useCallback, useState } from 'react';
import { defaultScope, reportMonths } from '../model';
import type { ReportFilter } from '../types';

/**
 * Bộ lọc màn Báo cáo: mẫu B1 mặc định, tháng trước, phạm vi đầu tiên khi danh sách phạm vi về.
 * Đổi mẫu → phạm vi về mặc định của mẫu đó.
 */
export function useReportFilter(scopes: ReportScopes | undefined) {
  // 12 tháng tính một lần lúc mở màn (đồng hồ không đọc lại mỗi lần vẽ)
  const [months] = useState(() => reportMonths(Date.now()));
  const [picked, setPicked] = useState<Partial<ReportFilter>>({});
  const template = picked.template ?? 'b1';
  const filter: ReportFilter = {
    template,
    month: picked.month ?? months[0] ?? '',
    scope: picked.scope ?? defaultScope(template, scopes),
  };
  const setTemplate = useCallback(
    (t: ReportTemplate) =>
      setPicked((p) => (p.month ? { month: p.month, template: t } : { template: t })),
    [],
  );
  const setMonth = useCallback((month: string) => setPicked((p) => ({ ...p, month })), []);
  const setScope = useCallback((scope: string) => setPicked((p) => ({ ...p, scope })), []);
  return { filter, months, setTemplate, setMonth, setScope };
}
