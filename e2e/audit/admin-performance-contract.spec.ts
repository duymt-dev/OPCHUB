import { test, expect } from '@playwright/test';
import { flightCatalog, bytes } from './admin-performance/flight';
import { performanceConfig } from './admin-performance/config';

const document = (messages: unknown) =>
  '<script>self.__next_f.push(' +
  JSON.stringify([1, '1:' + JSON.stringify(['$', 'provider', null, messages]) + '\n']) +
  ')</script>';

test('D-141 AC824-16 decodes actual queue JSON without executing inline script', () => {
  const html = document({
    locale: 'th',
    messages: { auth: { title: 'ไทย' }, reports: { messages: 'label' } },
  });
  const result = flightCatalog(html);
  expect(result.locale).toBe('th');
  expect(result.messages).toEqual({ auth: { title: 'ไทย' }, reports: { messages: 'label' } });
  expect(result.flight.bytes).toBeGreaterThan(0);
  expect(bytes('a')).toEqual(bytes(Buffer.from('a')));
});

test('D-141 AC824-16 rejects missing, duplicate, mixed and malformed catalog data', () => {
  expect(() => flightCatalog('<script>throw new Error("must not execute")</script>')).toThrow(
    'found 0',
  );
  const one = document({ locale: 'en', messages: { auth: { title: 'English' } } });
  expect(() => flightCatalog(one + one)).toThrow('found 2');
  expect(() =>
    flightCatalog(one + document({ locale: 'vi', messages: { auth: { title: 'Việt' } } })),
  ).toThrow('found 2');
  expect(() => flightCatalog('<script>self.__next_f.push([1,"1:{broken\n"])</script>')).toThrow();
});

test('D-141 AC824-16 metadata rejects external/default listeners and path-shaped dist', () => {
  const base = {
    version: 'current',
    source: '0e3803b3',
    root: 'root',
    dist: '.next-server-tip824',
    output: 'out',
    origin: 'http://127.0.0.1:53211',
  };
  expect(performanceConfig.safeParse(base).success).toBe(true);
  for (const origin of [
    'http://example.com:53211',
    'https://127.0.0.1:53211',
    'http://127.0.0.1:80',
  ])
    expect(performanceConfig.safeParse({ ...base, origin }).success).toBe(false);
  expect(performanceConfig.safeParse({ ...base, dist: '../../.next' }).success).toBe(false);
});
