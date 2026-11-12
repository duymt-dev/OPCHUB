'use client';

import { LanguageSwitch } from '@opchub/ui';
import type { ComponentProps } from 'react';
import styles from './admin-language-switch.module.css';

/** Admin owns its narrow topbar geometry; shared/Portal behavior stays unchanged. */
export function AdminLanguageSwitch(props: ComponentProps<typeof LanguageSwitch>) {
  return (
    <div className={styles.control}>
      <LanguageSwitch {...props} />
    </div>
  );
}
