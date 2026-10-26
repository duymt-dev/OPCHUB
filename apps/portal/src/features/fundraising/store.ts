import { create } from 'zustand';

/**
 * V4-610: popup "Thanh toán Gói Gọi vốn" mở từ hai nơi (prototype `fgId` / `fgPick`):
 * - sau khi gửi dự án có bật gọi vốn → `projectId` (chế độ dự án vừa đăng);
 * - nút "Đăng ký · 15.000.000đ/dự án" ở Bảng giá → `pick` (chọn dự án).
 */
interface FundraisingPopup {
  open: boolean;
  projectId: string | null;
  projectName: string;
  show: (projectId: string | null, projectName?: string) => void;
  hide: () => void;
}

export const useFundraisingPopup = create<FundraisingPopup>((set) => ({
  open: false,
  projectId: null,
  projectName: '',
  show: (projectId, projectName = '') => set({ open: true, projectId, projectName }),
  hide: () => set({ open: false, projectId: null, projectName: '' }),
}));

/** Mở popup từ feature khác (membership, projects) mà không import nội bộ */
export const openFundraisingPopup = (projectId: string | null, projectName?: string) =>
  useFundraisingPopup.getState().show(projectId, projectName);
