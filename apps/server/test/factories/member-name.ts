/** Numeric sequence suffixes disappear in affiliate normalization, exhausting the THU stem. */
export function testMemberName(id: string): string {
  const letters = id
    .replaceAll('-', '')
    .slice(0, 12)
    .toUpperCase()
    .replace(/\d/g, (digit) => String.fromCharCode(71 + Number(digit)));
  return `Người thử ${letters}`;
}
