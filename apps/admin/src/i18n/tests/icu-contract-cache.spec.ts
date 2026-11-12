import { describe, expect, it, vi } from 'vitest';
import { IntlMessageFormat } from 'intl-messageformat';
import { icuContract } from './icu-contract';

describe('D-141 AC824-02 immutable ICU signature cache, never a filesystem cache', () => {
  it('parses once per exact string and locale, not once per physical fixture traversal', () => {
    // Installed API declares a static parser; getAst is an own-instance method, not a prototype method.
    const original = IntlMessageFormat.__parse;
    if (!original) throw new Error('Installed ICU parser unavailable');
    const parse = vi.fn(original);
    IntlMessageFormat.__parse = parse;
    try {
      expect(icuContract('Cache fixture {cacheArgument}', 'en')).toEqual(['1:cacheArgument']);
      expect(icuContract('Cache fixture {cacheArgument}', 'en')).toEqual(['1:cacheArgument']);
      expect(parse).toHaveBeenCalledTimes(1);
      expect(icuContract('Cache fixture {cacheArgument}', 'my')).toEqual(['1:cacheArgument']);
      expect(parse).toHaveBeenCalledTimes(2);
      expect(icuContract('Cache fixture {changedArgument}', 'en')).toEqual(['1:changedArgument']);
      expect(parse).toHaveBeenCalledTimes(3);
    } finally {
      IntlMessageFormat.__parse = original;
    }
  });
  it('does not allow a caller to poison a later cached contract', () => {
    const result = icuContract('Defensive fixture <b>{defensiveArgument}</b>', 'en');
    result.push('invented');
    result.shift();
    expect(icuContract('Defensive fixture <b>{defensiveArgument}</b>', 'en')).toEqual([
      '1:defensiveArgument',
      'tag:b',
    ]);
  });
  it('still rejects malformed changed input after valid input and on repeated attempts', () => {
    expect(icuContract('Mutable fixture {validArgument}', 'en')).toEqual(['1:validArgument']);
    for (let i = 0; i < 2; i++) {
      expect(() => icuContract('Mutable fixture {validArgument', 'en')).toThrow();
      expect(() => icuContract('Mutable fixture <b>{validArgument}', 'en')).toThrow();
    }
    expect(icuContract('Mutable fixture {newArgument}', 'en')).toEqual(['1:newArgument']);
  });
  it('does not let a delimiter collision turn an invalid locale into a cached valid contract', () => {
    expect(icuContract('prefix\0suffix {value}', 'en')).toEqual(['1:value']);
    expect(() => icuContract('suffix {value}', 'en\0prefix')).toThrow();
  });
});
