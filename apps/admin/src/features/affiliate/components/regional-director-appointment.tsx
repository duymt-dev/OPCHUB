'use client';

import type { DirectorRegion } from '@opchub/shared/api-domains';
import { Button, Form, Modal, Select } from 'antd';
import { useTranslations } from 'next-intl';
import {
  useDirectorAppointment,
  type DirectorAppointmentOptions,
} from '../hooks/use-director-appointment';
import { RegionalDirectorMemberSelect } from './regional-director-member-select';
import styles from './regional-director.module.css';

export function RegionalDirectorAppointment({
  region,
  slots,
  write,
  canManage,
  close,
}: DirectorAppointmentOptions & { region: DirectorRegion | null }) {
  const t = useTranslations('affiliate.directors');
  const { form, submit } = useDirectorAppointment({ slots, write, canManage, close });
  return (
    <Modal
      open
      title={t('appoint')}
      onCancel={close}
      footer={null}
      destroyOnHidden
      closable={!write.isPending}
      maskClosable={!write.isPending}
      keyboard={!write.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ region: region ?? slots.find((slot) => !slot.incumbent)?.region }}
        onFinish={submit}
        disabled={!canManage || write.isPending}
      >
        <p>{t('subtitle')}</p>
        <Form.Item name="region" label={t('region')}>
          <Select
            options={slots.map((slot) => ({
              value: slot.region,
              label: t(`regions.${slot.region}`),
              disabled: !!slot.incumbent,
            }))}
          />
        </Form.Item>
        <RegionalDirectorMemberSelect />
        <p className={styles.exempt}>{t('exempt')}</p>
        {slots.every((slot) => slot.incumbent) ? <p>{t('full')}</p> : null}
        <div className={styles.actions}>
          <Button disabled={write.isPending} onClick={close}>
            {t('cancel')}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={write.isPending}
            disabled={!canManage || slots.every((slot) => slot.incumbent)}
          >
            {t('appoint')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
