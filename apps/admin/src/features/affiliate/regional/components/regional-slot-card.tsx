'use client';
import type { RegionalSlot } from '@opchub/shared/api-domains';
import { useRegionalWrites } from '../hooks/use-regional-writes';
import { RegionalBankFields } from './regional-bank-fields';
import { RegionalProvincePicker } from './regional-province-picker';
import styles from './regional.module.css';
import { RegionalSlotSummary } from './regional-slot-summary';
import { RegionalAssignment } from './regional-assignment';
import { useRegionalConfirmations } from '../hooks/use-regional-confirmations';

export function RegionalSlotCard({
  slot,
  canManage,
  forceOpen,
  onClose,
}: {
  slot: RegionalSlot;
  canManage: boolean;
  forceOpen: boolean;
  onClose: () => void;
}) {
  const write = useRegionalWrites(slot.region);
  const disabled = !canManage || write.isPending;
  const { revoke } = useRegionalConfirmations(slot, write.mutateAsync);
  return (
    <section id={`regional-${slot.region}`} className={`${styles.slot} ${styles[slot.region]}`}>
      <div className={styles.stripe} />
      <RegionalSlotSummary
        slot={slot}
        canManage={canManage}
        pending={write.isPending}
        onRevoke={revoke}
      />
      <div className={styles.slotBody}>
        <RegionalAssignment
          slot={slot}
          disabled={disabled}
          forceOpen={forceOpen}
          onClose={onClose}
          mutate={write.mutateAsync}
        />
        <RegionalProvincePicker
          region={slot.region}
          value={slot.provinces}
          disabled={disabled}
          onChange={(provinces) => write.mutate({ kind: 'patch', patch: { provinces } })}
        />
        <RegionalBankFields
          key={JSON.stringify(slot.bank)}
          bank={slot.bank}
          disabled={disabled}
          onSave={(bank) => write.mutate({ kind: 'patch', patch: { bank } })}
        />
      </div>
    </section>
  );
}
