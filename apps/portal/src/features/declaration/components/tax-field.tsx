'use client';

import { Field, LookupButton, TextInput } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { useBusinessDeclaration } from '../hooks/use-business-declaration';

/** Ô MST + "Tra cứu"; tra thấy → dòng xanh "✓ Đã tìm thấy doanh nghiệp…" */
export function TaxField({ f }: { f: ReturnType<typeof useBusinessDeclaration> }) {
  const t = useTranslations('declaration');
  return (
    <Field
      label={t('business.tax')}
      required
      note={f.autoFilled ? t('business.found') : undefined}
      error={f.err('tax')}
    >
      <LookupButton label={t('business.lookup')} onLookup={f.lookup.onLookup}>
        <TextInput
          value={f.lookup.tax}
          onValue={f.setTax}
          inputMode="numeric"
          placeholder={t('business.taxPlaceholder')}
        />
      </LookupButton>
    </Field>
  );
}
