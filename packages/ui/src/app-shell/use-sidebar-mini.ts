'use client';

import { useCallback, useState } from 'react';

/** Khóa localStorage trùng prototype ("opc-sb-mini") để nhớ trạng thái thu gọn */
export const SIDEBAR_MINI_KEY = 'opc-sb-mini';

/** Khung chỉ render phía client (sau khi có phiên) nên đọc storage ngay lúc khởi tạo */
function read(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_MINI_KEY) === '1';
  } catch {
    return false;
  }
}

/** Sidebar thu gọn 248 → 76px (chỉ ≥ 768px; ở mobile sidebar là drawer) */
export function useSidebarMini() {
  const [mini, setMini] = useState(read);

  const toggle = useCallback(() => {
    setMini((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(SIDEBAR_MINI_KEY, next ? '1' : '0');
      } catch {
        // trình duyệt chặn storage: vẫn đổi trong phiên
      }
      return next;
    });
  }, []);

  return { mini, toggle };
}
