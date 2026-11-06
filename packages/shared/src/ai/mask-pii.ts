/** REQ-628: run on all outbound content, never persist the original prompt. */
export function maskPii(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?<![\p{L}\d])(?:\+84|0)(?:[ .-]*\d){9}(?![\d])/gu, '[SĐT]')
    .replace(/(?<![\p{L}\d])\d{9,19}(?![\p{L}\d])/gu, '[STK]');
}
