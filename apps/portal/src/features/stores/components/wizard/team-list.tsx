'use client';

import type { StoreUpsert } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import { storeInitials } from '../../model';
import p from './profile.module.css';

export function TeamList({ draft, set }: { draft: StoreUpsert; set: DraftPatch }) {
  const t = useTranslations('stores.wizard');
  return (
    <div className={p.teamList}>
      {draft.team.map((m, i) => (
        <div key={`${m.name}-${i}`} className={p.member}>
          <span
            className={p.avatar}
            style={m.photoUrl ? { backgroundImage: `url('${m.photoUrl}')` } : undefined}
          >
            {m.photoUrl ? null : storeInitials(m.name)}
          </span>
          <div className={p.memberText}>
            <span className={p.memberName}>{m.name}</span>
            <span className={p.memberRole}>{m.role}</span>
          </div>
          <button
            type="button"
            className={p.memberX}
            title={t('remove')}
            onClick={() => set((d) => ({ team: d.team.filter((_, j) => j !== i) }))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
