import { describe, expect, it } from 'vitest';
import { storageKeyOf } from './media-gc.service';

const BASE = 'https://files.opchub.test/';

describe('MediaGcService (NA-26)', () => {
  it('REQ-226 chỉ enqueue URL storage — data URL / URL ngoài / khoá lạ bị bỏ qua', () => {
    expect(storageKeyOf(`${BASE}avatar/u1/a.png`, BASE)).toBe('avatar/u1/a.png');
    expect(storageKeyOf('data:image/png;base64,AAAA', BASE)).toBeNull();
    expect(storageKeyOf('https://cdn.example.com/a.png', BASE)).toBeNull();
    expect(storageKeyOf(`${BASE}../etc/passwd`, BASE)).toBeNull();
    expect(storageKeyOf(`${BASE}a.png?x=1`, BASE)).toBeNull();
    expect(storageKeyOf(null, BASE)).toBeNull();
    expect(storageKeyOf(BASE, BASE)).toBeNull();
  });
});
