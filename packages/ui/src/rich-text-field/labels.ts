/** Nhãn thanh công cụ + hộp liên kết của RichTextField — app truyền bản dịch qua `labels` (D-65) */
export interface RichTextLabels {
  close?: string;
  undo: string;
  redo: string;
  heading: string;
  paragraph: string;
  bold: string;
  italic: string;
  underline: string;
  strike: string;
  bulletList: string;
  bulletListTitle: string;
  orderedList: string;
  orderedListTitle: string;
  quote: string;
  link: string;
  linkTitle: string;
  clear: string;
  linkUrl: string;
  linkInsert: string;
  linkRemove: string;
  linkCancel: string;
  linkInvalid: string;
}

export const DEFAULT_RICH_TEXT_LABELS: RichTextLabels = {
  undo: 'Hoàn tác (Ctrl+Z)',
  redo: 'Làm lại (Ctrl+Y)',
  heading: 'Tiêu đề',
  paragraph: 'Đoạn văn',
  bold: 'In đậm',
  italic: 'In nghiêng',
  underline: 'Gạch chân',
  strike: 'Gạch ngang',
  bulletList: '• Danh sách',
  bulletListTitle: 'Danh sách',
  orderedList: '1. Danh sách',
  orderedListTitle: 'Danh sách số',
  quote: 'Trích dẫn',
  link: 'Liên kết',
  linkTitle: 'Chèn liên kết',
  clear: 'Xoá định dạng',
  linkUrl: 'Đường dẫn',
  linkInsert: 'Chèn',
  linkRemove: 'Gỡ liên kết',
  linkCancel: 'Huỷ',
  linkInvalid: 'Đường dẫn phải bắt đầu bằng http:// hoặc https://',
};
