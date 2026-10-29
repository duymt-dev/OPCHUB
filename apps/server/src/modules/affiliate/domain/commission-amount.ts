/** D-110 (thay D-53 / D-70 làm tròn xuống): hoa hồng = phí thực trả × % / 100, làm tròn đến đồng (VND nguyên) */
export function commissionAmount(listAmount: number, rate: number): number {
  return Math.round((listAmount * rate) / 100);
}
