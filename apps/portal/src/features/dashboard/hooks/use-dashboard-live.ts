'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { dashboardKeys, fetchDashboardLive } from '../api';

/** Số liệu LIVE (DV-05: ảnh chụp từ API, không mô phỏng ngẫu nhiên trong component) */
export function useDashboardLive() {
  return useQuery({ queryKey: dashboardKeys.live(), queryFn: fetchDashboardLive });
}

/** Đồng hồ hero; nhịp 3 giây như bộ đếm của prototype */
export function useNow(intervalMs = 3_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
