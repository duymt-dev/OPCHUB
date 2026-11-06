/** REQ-628: run on all outbound content, never persist the original prompt. */
export function maskPii(text: string): string {
  // Resource UUIDs are identifiers, not bank-account substrings (including all-digit tails).
  return text
    .split(/(\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b)/gi)
    .map((part, index) => (index % 2 ? part : maskText(part)))
    .join('');
}

function maskText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?<![\p{L}\d])(?:\+84|0)(?:[ .-]*\d){9}(?![\d])/gu, '[SĐT]')
    .replace(/(?<![\p{L}\d])\d{9,19}(?![\p{L}\d])/gu, '[STK]');
}
