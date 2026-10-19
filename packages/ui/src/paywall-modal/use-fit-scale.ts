'use client';

import { type RefObject, useEffect } from 'react';

/** Ngưỡng 2 cột + thu nhỏ (§23.5, prototype `_svFit`) */
export const FIT_MIN_WIDTH = 1100;
const MAX_WIDTH = 1440;

/**
 * Tính tỉ lệ thu nhỏ để hộp rộng W/z cao vừa H (lặp tối đa 3 vòng như prototype): nội dung
 * hẹp lại thì cao lên, nên tỉ lệ hội tụ sau vài vòng. Hàm thuần — test ở paywall-modal.spec.
 */
export function fitScale(
  vw: number,
  vh: number,
  heightAt: (width: number) => number,
): { width: number; scale: number } {
  const w = Math.min(vw * 0.95, MAX_WIDTH);
  const h = vh * 0.95;
  let z = 1;
  for (let k = 0; k < 3; k++) {
    const nz = Math.min(1, h / heightAt(w / z));
    if (Math.abs(nz - z) < 0.005) break;
    z = nz;
  }
  return { width: w / z, scale: z };
}

/**
 * Chế độ `fit` (REQ-391, AT-LK04): viewport ≥ 1100px → hộp không cuộn, thu nhỏ bằng
 * `transform: scale` cho vừa 95% chiều cao. Hẹp hơn → bỏ hết style, CSS tự về 1 cột cuộn dọc.
 */
export function useFitScale(ref: RefObject<HTMLDivElement | null>, on: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let last = 0;
    const reset = () => {
      el.style.width = '';
      el.style.maxHeight = '';
      el.style.overflowY = '';
      el.style.transform = '';
      last = 0;
    };
    const apply = () => {
      if (window.innerWidth < FIT_MIN_WIDTH) return reset();
      el.style.maxHeight = 'none';
      el.style.overflowY = 'hidden';
      const { width, scale } = fitScale(window.innerWidth, window.innerHeight, (w) => {
        el.style.width = `${w}px`;
        return el.scrollHeight;
      });
      el.style.width = `${width}px`;
      if (Math.abs(scale - last) >= 0.005) {
        el.style.transform = `translate(-50%, -50%) scale(${scale})`;
        last = scale;
      }
      el.scrollTop = 0;
    };
    apply();
    window.addEventListener('resize', apply);
    // AT-LK04: trang phía sau không cuộn khi popup V4 mở (không có thanh cuộn nào trên màn)
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    // Nội dung tải muộn (danh mục dịch vụ, ảnh) đổi chiều cao → tính lại
    const inner = el.firstElementChild?.nextElementSibling;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => apply());
    if (inner) ro?.observe(inner);
    return () => {
      window.removeEventListener('resize', apply);
      ro?.disconnect();
      root.style.overflow = prevOverflow;
      reset();
    };
  }, [ref, on]);
}
