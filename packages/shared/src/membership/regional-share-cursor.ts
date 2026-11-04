import { regionalShareCursorSchema } from '../api-domains/regional-shares';
export function encodeRegionalShareCursor(cursor: { recordedAt: string; id: string }) {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export function decodeRegionalShareCursor(cursor: string) {
  try {
    const raw = atob(cursor.replaceAll('-', '+').replaceAll('_', '/'));
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    const parsed = regionalShareCursorSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
