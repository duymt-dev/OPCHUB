/**
 * Đọc ảnh chọn từ máy thành data URL để xem trước. Chưa có adapter storage (presigned URL MinIO)
 * nên ảnh lưu kèm dự án dạng data URL trong MSW — xem DV-G3b-3.
 */
export function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => (typeof r.result === 'string' ? resolve(r.result) : reject(new Error('read')));
    r.onerror = () => reject(r.error ?? new Error('read'));
    r.readAsDataURL(file);
  });
}
