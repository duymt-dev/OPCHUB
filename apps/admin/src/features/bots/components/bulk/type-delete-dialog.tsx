import type { BotConversationType } from '@opchub/shared/api-domains';
import { Modal } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { useBotConversationTypes } from '../../hooks/use-bot-conversation-types';
import { BulkError } from './bulk-error';

export function TypeDeleteDialog({
  target,
  catalog,
  onClose,
  onDeleted,
}: {
  target: BotConversationType | null;
  catalog: ReturnType<typeof useBotConversationTypes>;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations('bots.bulk');
  const remove = async () => {
    if (target && (await catalog.remove(target.id)).ok) onDeleted(target.id);
  };
  return (
    <Modal
      open={target !== null}
      title={t('deleteType')}
      size="small"
      onClose={onClose}
      dismissible={!catalog.busy}
      closeLabel={t('close')}
      footer={
        <>
          <Button disabled={catalog.busy} onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            danger
            type="primary"
            loading={catalog.busy}
            disabled={!catalog.allowed}
            onClick={() => void remove()}
          >
            {t('deleteType')}
          </Button>
        </>
      }
    >
      {t('deleteTypeBody', { name: target?.name ?? '' })}
      <BulkError error={catalog.error} />
    </Modal>
  );
}
