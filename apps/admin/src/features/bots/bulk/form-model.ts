import { botBulkCreateSchema } from '@opchub/shared/api-domains';
import type { BulkFormValues } from './types';

export const bulkInputSchema = botBulkCreateSchema.omit({ requestId: true });
export const initialBulkValues: BulkFormValues = {
  topicsText: '',
  typeId: 'builtin-qa',
  perTopic: 2,
  turns: 4,
  delayMinutes: 5,
  groupIds: [],
};
export function parseBulkForm(values: BulkFormValues) {
  const { topicsText, ...fields } = values;
  return bulkInputSchema.safeParse({ ...fields, topics: topicsText.split(/\r?\n/) });
}
export function bulkFieldName(path: string): keyof BulkFormValues | null {
  const name = path.split(/[.[]/)[0] ?? path;
  if (name === 'topics' || name === 'topicsText') return 'topicsText';
  if (
    name === 'typeId' ||
    name === 'perTopic' ||
    name === 'turns' ||
    name === 'delayMinutes' ||
    name === 'groupIds'
  )
    return name;
  return null;
}
