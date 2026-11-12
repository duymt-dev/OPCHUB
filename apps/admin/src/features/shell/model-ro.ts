/**
 * RB-R07 (prototype `roGuard`): nút thao tác ghi bị chặn trong chế độ chỉ xem. Nhãn bắt đầu bằng
 * động từ ghi → chặn; nút xem/đóng/điều hướng → cho qua. `data-ro-ok` đánh dấu nút luôn được phép.
 */
export const WRITE_LABEL =
  /^(\+ |Tạo|Thêm|Sửa|Chỉnh sửa|Xóa|Xoá|Khóa|Khoá|Mở khóa|Mở khoá|Gán|Xuất|Duyệt|Từ chối|Ẩn|Hiện|Chi trả|Hủy|Huỷ|Lưu|Ghi nhận|Nhắc|Kích hoạt|Thu hồi|Gửi|Check-in|Đổi|Xác nhận|Đăng|Bỏ|Chạy|Tạm dừng|Phản hồi|Chuyển)/;
const SAFE_LABEL = /^(Xem|Chi tiết|Đóng|Quay lại|‹|›)/;

export interface RoTarget {
  tag: string;
  text: string;
  title: string;
  roOk: boolean;
  /** `[data-act]`, select, checkbox — luôn là thao tác */
  act: boolean;
  pointer: boolean;
}

/** Duyệt từ phần tử được bấm lên vùng nội dung: `true` nếu là thao tác ghi cần chặn */
export function isWriteClick(path: readonly RoTarget[]): boolean {
  // A descendant may inherit cursor:pointer. Its enclosing button/marker defines the action.
  const control = path.find((el) => el.roOk || el.act || el.tag === 'BUTTON' || el.tag === 'A');
  const targets = control ? [control] : path;
  for (const el of targets) {
    if (el.roOk) return false;
    if (el.act) return true;
    if (el.pointer || el.tag === 'BUTTON' || el.tag === 'A') {
      const tx = el.text.trim();
      if (SAFE_LABEL.test(tx)) return false;
      return WRITE_LABEL.test(tx) || WRITE_LABEL.test(el.title);
    }
  }
  return false;
}
