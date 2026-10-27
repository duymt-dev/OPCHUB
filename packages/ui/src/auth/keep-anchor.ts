import type { MouseEvent } from 'react';

/**
 * Nút chuyển màn Auth (tab, quên mật khẩu, đổi loại…): bấm chuột không lấy focus. Prototype dùng
 * `div` nên Chrome neo cuộn theo nội dung khi thẻ form đổi chiều cao; nút có focus sẽ thành điểm neo
 * và trang nhảy khác prototype (TIP-V4-617). Bàn phím vẫn focus / Enter bình thường.
 */
export const keepAnchor = (e: MouseEvent) => e.preventDefault();
