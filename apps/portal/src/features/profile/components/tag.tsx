import type { ReactNode } from 'react';
import styles from './tags.module.css';

export type TagTone = 'blue' | 'violet' | 'green' | 'red' | 'amber';

export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>;
}
