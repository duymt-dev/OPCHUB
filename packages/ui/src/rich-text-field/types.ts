export interface RichTextFieldProps {
  /** HTML (rỗng = chưa nhập) */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
  /** Lỗi tại ô (BUG-022): id chữ lỗi → ô soạn thảo `aria-invalid` + `aria-describedby`, khung đỏ */
  errorId?: string | undefined;
}
