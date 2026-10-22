import { describe, expect, it } from 'vitest';
import messages from '../../../messages/vi/bots.json';

describe('REQ-140 Bot error copy encoding', () => {
  it('preserves Vietnamese characters in the data-loading error', () => {
    // Escapes keep the oracle independent of shell/source-file encoding.
    expect(messages.disabled).toBe(
      'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c d\u1eef li\u1ec7u Bot. Vui l\u00f2ng th\u1eed l\u1ea1i.',
    );
    expect(messages.disabled).not.toContain('?');
    expect(messages.disabled).not.toContain('\ufffd');
  });
});
