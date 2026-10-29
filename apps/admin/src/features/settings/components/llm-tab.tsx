'use client';

import { Alert, Button, Form, Spin } from 'antd';
import {
  llmConfigUpdateSchema,
  llmConfigVerifySchema,
  type LlmConfig,
  type LlmConfigUpdate,
} from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useLlmConfig } from '../hooks/use-llm-config';
import { LlmFields } from './llm-fields';
import styles from './llm.module.css';

function LlmForm({ saved, state }: { saved: LlmConfig; state: ReturnType<typeof useLlmConfig> }) {
  const t = useTranslations('settings.llm');
  const [form] = Form.useForm<LlmConfigUpdate>();
  const submit = (values: LlmConfigUpdate, verify = false) => {
    const parsed = (verify ? llmConfigVerifySchema : llmConfigUpdateSchema).safeParse(values);
    if (!parsed.success) {
      form.setFields(
        Object.keys(llmConfigUpdateSchema.shape).flatMap((field) => {
          const name = field as keyof LlmConfigUpdate;
          const errors = parsed.error.issues
            .filter((issue) => issue.path[0] === name)
            .map((issue) => issue.message);
          return errors.length ? [{ name, errors }] : [];
        }),
      );
      return;
    }
    if (verify) state.verify.mutate(parsed.data);
    else state.save.mutate(parsed.data, { onSuccess: () => form.setFieldsValue({ key: '' }) });
  };
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(v) => submit(v)}
      initialValues={{
        baseUrl: saved.baseUrl,
        model: saved.model,
        key: '',
        maxTokens: saved.maxTokens,
        timeoutMs: saved.timeoutMs,
        enabled: saved.enabled,
      }}
      onValuesChange={() => state.verify.reset()}
    >
      <LlmFields saved={saved} />
      <div className={styles.actions}>
        <Button
          type="primary"
          htmlType="submit"
          loading={state.save.isPending}
          disabled={state.verify.isPending}
        >
          {t('save')}
        </Button>
        <Button
          loading={state.verify.isPending}
          disabled={state.save.isPending}
          onClick={() => {
            void form
              .validateFields()
              .then((v) => submit(v, true))
              .catch(() => undefined);
          }}
        >
          {t('verify')}
        </Button>
      </div>
      {state.verify.data && (
        <Alert
          className={styles.result ?? ''}
          type={state.verify.data.ok ? 'success' : 'error'}
          title={state.verify.data.message}
          showIcon
        />
      )}
    </Form>
  );
}

/** ADR-0008: independent settings subview; no key value is ever read back into the form. */
export function LlmTab() {
  const t = useTranslations('settings.llm');
  const state = useLlmConfig();
  if (state.query.isPending) return <Spin />;
  if (!state.query.data)
    return (
      <Alert
        type="error"
        title={t('loadError')}
        action={
          <Button
            onClick={() => {
              void state.query.refetch();
            }}
          >
            {t('retry')}
          </Button>
        }
      />
    );
  const saved = state.query.data;
  return (
    <section className={styles.card}>
      <h2>{t('title')}</h2>
      <p>{t('description')}</p>
      <Alert
        type={saved.configured ? 'success' : 'warning'}
        showIcon
        title={saved.configured ? t('configured') : t('unconfigured')}
        description={t('warning')}
      />
      <LlmForm key={saved.updatedAt ?? 'empty'} saved={saved} state={state} />
    </section>
  );
}
