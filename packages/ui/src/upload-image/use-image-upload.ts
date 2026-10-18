'use client';

import { useCallback, useState } from 'react';
import { type ImageProblem, validateImageFile } from './compress-image';

export interface ImagePickHandlers {
  /** Giá trị đang có — tải lỗi thì trả lại (giữ ảnh cũ, NA-26) */
  previous: string | null;
  /** Ghi giá trị ô: blob URL xem trước trong lúc tải, rồi URL storage */
  apply: (url: string | null) => void;
  /** Sai định dạng / quá 5 MB — không đổi ô */
  onInvalid: (problem: ImageProblem) => void;
  onError: (err: unknown) => void;
  /** false = không xem trước (ô lưu ngay khi đổi, như logo) */
  preview?: boolean;
}

/**
 * Chọn ảnh → kiểm → xem trước `URL.createObjectURL` → `upload` (nén + presign + PUT) → URL storage.
 * `uploading` để khoá nút Lưu trong lúc tải.
 */
export function useImageUpload(upload: (file: File) => Promise<string>) {
  const [busy, setBusy] = useState(0);

  const pick = useCallback(
    (file: File, h: ImagePickHandlers) => {
      const problem = validateImageFile(file);
      if (problem) {
        h.onInvalid(problem);
        return;
      }
      const preview = h.preview === false ? null : URL.createObjectURL(file);
      if (preview) h.apply(preview);
      setBusy((n) => n + 1);
      upload(file)
        .then((url) => h.apply(url))
        .catch((err: unknown) => {
          if (preview) h.apply(h.previous);
          h.onError(err);
        })
        .finally(() => {
          if (preview) URL.revokeObjectURL(preview);
          setBusy((n) => n - 1);
        });
    },
    [upload],
  );

  return { uploading: busy > 0, pick };
}
