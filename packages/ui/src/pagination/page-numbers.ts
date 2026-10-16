export type PageToken = number | 'ellipsis';

/**
 * Dãy số trang giống hàm pg() của prototype:
 * ≤ 7 trang thì hiện hết; nhiều hơn thì giữ trang đầu, cuối, hiện tại ±1, phần còn lại là "…".
 */
export function pageNumbers(current: number, pages: number): PageToken[] {
  const out: PageToken[] = [];
  for (let i = 1; i <= pages; i++) {
    if (pages <= 7 || i === 1 || i === pages || Math.abs(i - current) <= 1) out.push(i);
    else if (out[out.length - 1] !== 'ellipsis') out.push('ellipsis');
  }
  return out;
}

/** Số trang tối thiểu 1; trang hiện tại kẹp trong [1, pages] (BR-12: lọc làm vượt tổng thì lùi) */
export function clampPage(page: number, total: number, size: number) {
  const pages = Math.max(1, Math.ceil(total / size));
  return { pages, page: Math.min(Math.max(1, page), pages) };
}
