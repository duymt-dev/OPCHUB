import { expect, test } from '@playwright/test';
import { isDiscardedDocumentBody } from './response-lifetime';

const message =
  'response.json: Protocol error (Network.getResponseBody): No resource with given identifier found';
const cases = [
  ['older document', new Error(message), 1, 2, true],
  [
    'body method older document',
    new Error(message.replace('response.json', 'response.body')),
    1,
    2,
    true,
  ],
  ['same document', new Error(message), 2, 2, false],
  ['unknown request epoch', new Error(message), undefined, 2, false],
  ['future epoch', new Error(message), 3, 2, false],
  ['malformed JSON', new SyntaxError('Unexpected token'), 1, 2, false],
  [
    'different protocol error',
    new Error('response.json: Protocol error (Network.enable): failed'),
    1,
    2,
    false,
  ],
  ['unrelated message', new Error('Server validation failed'), 1, 2, false],
  ['non-error object', { message }, 1, 2, false],
  ['unanchored text', new Error(`Unexpected payload: ${message}`), 1, 2, false],
] as const;

for (const [name, error, from, to, expected] of cases)
  test(`D-141 observation lifetime only: ${name}`, () => {
    expect(isDiscardedDocumentBody(error, from, to, from === to)).toBe(expected);
  });

test('D-141 observation lifetime only: restored current loader is never discarded', () => {
  expect(isDiscardedDocumentBody(new Error(message), 1, 3, true)).toBe(false);
});
