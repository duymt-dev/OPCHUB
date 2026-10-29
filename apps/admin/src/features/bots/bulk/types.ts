import type { Persona } from '@opchub/shared/api-domains';
import type { GroupRef } from '../types';

export interface BulkFormValues {
  topicsText: string;
  typeId: string;
  perTopic: number;
  turns: number;
  delayMinutes: number;
  groupIds: string[];
}
export interface BulkModalProps {
  groups: GroupRef[];
  personas: Persona[];
  automaticTopics: string[];
  onClose: () => void;
}
