'use client';

import { useState } from 'react';
import type { AffiliateRateEditorProps } from '../types';
import { useAffiliateWrites } from './use-affiliate-writes';

export function useAffiliateRateEditor({ id, rate }: AffiliateRateEditorProps) {
  const { access, rates } = useAffiliateWrites();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(rate);
  const valid = draft !== null && Number.isInteger(draft) && draft >= 1 && draft <= 50;
  const open = () => {
    if (!access.guard('affiliate.action')) return;
    setDraft(rate);
    setEditing(true);
  };
  const save = () => {
    if (!valid || rates.isPending) return;
    void rates
      .mutateAsync({ ids: [id], rate: draft })
      .then((result) => {
        if (result) setEditing(false);
      })
      .catch(() => undefined);
  };
  const cancel = () => {
    if (!rates.isPending) setEditing(false);
  };
  return { editing, draft, setDraft, valid, open, save, cancel, pending: rates.isPending };
}
