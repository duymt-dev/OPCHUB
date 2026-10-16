export interface RichTextFieldProps {
  /** HTML (rỗng = chưa nhập) */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
}
