import { HttpResponse } from 'msw/http';

/**
 * Mô phỏng `toPlainText` của server (NA-27, BUG-020) cho bình luận: chuỗi giống markup → bỏ thẻ,
 * bỏ nội dung `script/style`; chuỗi như `"2 < 3"` giữ nguyên. Chạy trong trình duyệt (DOMParser).
 */
const MARKUP = /<\/?[a-z][a-z0-9-]*[\s>/]|<!--/i;

export function toPlainText(s: string): string {
  let cur = s;
  for (let i = 0; i < 5 && MARKUP.test(cur); i += 1) {
    const doc = new DOMParser().parseFromString(`<body>${cur}</body>`, 'text/html');
    doc.querySelectorAll('script,style,template,noscript').forEach((n) => n.remove());
    cur = doc.body.textContent ?? '';
  }
  return cur;
}

/** Sau làm sạch rỗng → 400 như server (`fields[{path:'body'}]`) */
export function emptyAfterClean(path: string) {
  const message = 'Nội dung không hợp lệ';
  return HttpResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        fields: [{ path, message }],
        requestId: crypto.randomUUID(),
      },
    },
    { status: 400 },
  );
}
