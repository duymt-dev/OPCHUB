'use client';
import { Button, Popover, Space, Typography } from 'antd';
import type { AiSuggestionProps } from './types';
import { useAiSuggestion } from './hooks/use-ai-suggestion';
import styles from './ai-suggestion.module.css';

export function AiSuggestButton(p: AiSuggestionProps) {
  const s = useAiSuggestion(p);
  return (
    <Popover
      open={s.text !== null}
      title={p.labels.preview}
      content={
        <div className={styles.preview}>
          <Typography.Paragraph className={styles.text ?? ''}>{s.text}</Typography.Paragraph>
          <Space wrap>
            <Button type="primary" disabled={p.disabled ?? false} onClick={s.apply}>
              {p.labels.use}
            </Button>
            <Button onClick={s.dismiss}>{p.labels.dismiss}</Button>
          </Space>
        </div>
      }
    >
      <Button
        aria-label={p.labels.suggest}
        type="default"
        loading={s.pending}
        disabled={p.disabled ?? false}
        onClick={() => void s.suggest()}
      >
        {p.labels.suggest}
      </Button>
    </Popover>
  );
}
