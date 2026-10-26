/**
 * Màn Auth v4 là một trang trên ảnh nền `fixed`: đổi đăng nhập ↔ đăng ký ↔ quên mật khẩu giữ vị trí
 * cuộn như prototype (đổi state, không cuộn về đầu) — TIP-V4-617
 */
export const KEEP_SCROLL = { scroll: false } as const;

/**
 * Rời màn Auth vào app: về đầu trang trước khi chuyển. Màn Auth ở 390 thường đã cuộn tới thẻ form;
 * Next giữ neo cuộn của Chrome nên trang sau (Dashboard dài) mở giữa chừng thay vì từ đầu.
 */
export const leaveAuth = (go: () => void) => {
  window.scrollTo(0, 0);
  go();
};
