/** D-53: hoa hồng = phí niêm yết × % / 100, làm tròn xuống đồng (tiền nguyên VND) */
export function commissionAmount(listAmount: number, rate: number): number {
  return Math.floor((listAmount * rate) / 100);
}
