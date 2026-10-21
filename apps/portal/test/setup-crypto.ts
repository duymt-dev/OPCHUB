import { webcrypto } from 'node:crypto';

// jsdom lacks SubtleCrypto; use Node's real Web Crypto, not a password bypass.
if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
