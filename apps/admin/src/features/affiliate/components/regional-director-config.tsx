'use client';

import type { DirectorRegion } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { App, Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRegionalDirectors } from '../hooks/use-regional-directors';
import { RegionalDirectorAppointment } from './regional-director-appointment';
import { RegionalDirectorCard } from './regional-director-card';
import { RegionalDirectorHistory } from './regional-director-history';
import styles from './regional-director.module.css';

export function RegionalDirectorConfig() {
  const t = useTranslations('affiliate.directors');
  const { message } = App.useApp();
  const { config, history, write, canManage } = useRegionalDirectors();
  const [appointment, setAppointment] = useState<{ region: DirectorRegion | null } | null>(null);
  if (config.isPending) return <PageSkeleton />;
  if (config.isError)
    return (
      <ErrorState
        title={t('error')}
        retryLabel={t('retry')}
        onRetry={() => void config.refetch()}
      />
    );
  const value = config.data;
  return (
    <div className={styles.config}>
      <div className={styles.heading}>
        <div>
          <b>{t('title')}</b>
          <p>{t('subtitle')}</p>
        </div>
        <Button
          type="primary"
          disabled={!canManage || write.isPending}
          onClick={() =>
            value.slots.every((slot) => slot.incumbent)
              ? void message.info(t('full'))
              : setAppointment({ region: null })
          }
        >
          {t('appoint')}
        </Button>
      </div>
      <div className={styles.info}>
        {(['appointment', 'revocation', 'scope'] as const).map((key) => (
          <div key={key}>
            <small>{t(`info.${key}.title`)}</small>
            <span>{t(`info.${key}.text`)}</span>
          </div>
        ))}
      </div>
      {!canManage ? <div className={styles.banner}>{t('readOnly')}</div> : null}
      <div className={styles.banner}>
        {value.unassignedProvinces.length
          ? t('unassigned', { provinces: value.unassignedProvinces.join(', ') })
          : t(value.slots.every((slot) => slot.incumbent) ? 'allAssigned' : 'allRegionsAssigned')}
      </div>
      <div className={styles.grid}>
        {value.slots.map((slot) => (
          <RegionalDirectorCard
            key={slot.region}
            slot={slot}
            unassigned={value.unassignedProvinces}
            disabled={!canManage}
            busy={write.isPending}
            run={(command) => write.mutateAsync(command)}
            appoint={(region) => setAppointment({ region })}
          />
        ))}
      </div>
      <RegionalDirectorHistory query={history} />
      {appointment ? (
        <RegionalDirectorAppointment
          key={appointment.region ?? 'all'}
          region={appointment.region}
          slots={value.slots}
          write={write}
          canManage={canManage}
          close={() => setAppointment(null)}
        />
      ) : null}
    </div>
  );
}
