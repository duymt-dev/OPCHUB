import type { ConfigProviderProps } from 'antd';

/** These are formatter tokens, not visible English text. All other installed text must be mapped. */
const TOKENS = new Set(['', 'YYYY', 'D', 'A']);

export function translateAntdLocale(
  source: NonNullable<ConfigProviderProps['locale']>,
  translations: Readonly<Record<string, string>>,
): NonNullable<ConfigProviderProps['locale']> {
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') {
      if (TOKENS.has(value)) return value;
      if (!Object.hasOwn(translations, value))
        throw new Error(`Untranslated AntD locale text: ${value}`);
      return translations[value];
    }
    if (Array.isArray(value)) return value.map((child: unknown) => walk(child));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child)]));
    }
    if (typeof value === 'function') throw new Error('AntD locale must be serializable');
    return value;
  };
  return walk(source) as NonNullable<ConfigProviderProps['locale']>;
}
