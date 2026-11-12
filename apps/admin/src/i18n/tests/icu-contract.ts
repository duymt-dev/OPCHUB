import { IntlMessageFormat } from 'intl-messageformat';

type Elements = ReturnType<IntlMessageFormat['getAst']>;

// Test/build validation only: identical immutable message+locale has an identical contract.
// Never cache files, resolved catalogs or failures; changed fixture bytes still parse anew.
const contracts = new Map<string, readonly string[]>();
const MAX_CONTRACTS = 32_768;

/** Public ICU AST discriminants: literal=0, argument=1, number=2, date=3, time=4,
 * select=5, plural=6, pound=7, tag=8. A regex cannot distinguish these contracts. */
function signatures(elements: Elements, result = new Set<string>()): Set<string> {
  for (const element of elements) {
    if ('children' in element) {
      result.add(`tag:${element.value}`);
      signatures(element.children, result);
    } else if ('options' in element) {
      const keys = Object.keys(element.options);
      if (!keys.includes('other')) throw new Error('ICU requires other');
      const isPlural = 'pluralType' in element;
      const selectors = isPlural ? keys.filter((key) => key.startsWith('=')) : keys;
      const detail = isPlural ? `:${element.pluralType}:${element.offset}` : '';
      result.add(`${element.type}:${element.value}${detail}:${selectors.sort().join(',')}`);
      for (const option of Object.values(element.options)) signatures(option.value, result);
    } else if ('value' in element && Number(element.type) !== 0) {
      result.add(`${element.type}:${element.value}`);
    }
  }
  return result;
}

export function icuContract(message: string, locale: string): string[] {
  const key = `${locale}\0${message}`;
  const cached = contracts.get(key);
  if (cached) return [...cached];
  const ast = new IntlMessageFormat(message, locale).getAst();
  const result = [...signatures(ast)].sort();
  if (contracts.size < MAX_CONTRACTS) contracts.set(key, result);
  return [...result];
}
