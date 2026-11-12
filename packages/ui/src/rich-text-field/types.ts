import type { RichTextLabels } from './labels';

export interface RichTextFieldProps {
  /** HTML (rỗng = chưa nhập) */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
  /** Lỗi tại ô (BUG-022): id chữ lỗi → ô soạn thảo `aria-invalid` + `aria-describedby`, khung đỏ */
  errorId?: string | undefined;
  /** Bản dịch nhãn; thiếu khoá → tiếng Việt mặc định */
  labels?: Partial<RichTextLabels> | undefined;
  /** Optional keyboard activation; omitted preserves existing consumers. */
  keyboardControls?: boolean;
}
