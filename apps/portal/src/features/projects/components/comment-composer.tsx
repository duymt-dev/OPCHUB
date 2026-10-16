'use client';

import { COMMENT_TYPES } from '@opchub/shared/api-domains';
import type { ProjectCommentView } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { COMMENT_TONE } from '../model';
import type { CommentType, DetailParams } from '../types';
import { Face } from './bits';
import styles from './comments.module.css';

const PH_KEY = {
  feedback: 'phFeedback',
  question: 'phQuestion',
  partnership: 'phPartnership',
} as const;

interface HeadProps {
  comments: ProjectCommentView[];
  params: DetailParams;
  onParams: (patch: Partial<DetailParams>) => void;
}

/** Tiêu đề "Góp ý từ cộng đồng" + Mới nhất/Hữu ích nhất + lọc theo loại */
export function CommentsHead({ comments, params, onParams }: HeadProps) {
  const t = useTranslations('projects.comments');
  const filters = [
    { k: 'all' as const, n: comments.length },
    ...COMMENT_TYPES.map((k) => ({ k, n: comments.filter((c) => c.type === k).length })),
  ];
  return (
    <>
      <div className={styles.head}>
        <span className={styles.title}>{t('title')}</span>
        <div className={styles.seg} role="radiogroup">
          {(['new', 'top'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={params.csort === k}
              className={`${styles.segItem} ${params.csort === k ? styles.segOn : ''}`}
              onClick={() => onParams({ csort: k })}
            >
              {k === 'new' ? t('sortNew') : t('sortTop')}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filters}>
        {filters.map((f) => (
          <button
            key={f.k}
            type="button"
            aria-pressed={params.ctype === f.k}
            className={`${styles.filter} ${params.ctype === f.k ? styles.filterOn : ''}`}
            onClick={() => onParams({ ctype: f.k })}
          >
            {t(f.k)} {f.n}
          </button>
        ))}
      </div>
    </>
  );
}

type PostFn = (type: CommentType, body: string, done: () => void) => void;

/** Ô soạn góp ý: chọn loại, nội dung, "Gửi góp ý" (`done` xoá nội dung khi đã gửi) */
export function CommentComposer({ onPost }: { onPost: PostFn }) {
  const t = useTranslations('projects.comments');
  const me = useAuthStore((s) => s.me);
  const [type, setType] = useState<CommentType>('feedback');
  const [draft, setDraft] = useState('');
  return (
    <div className={styles.composer}>
      <Face name={me?.fullName ?? ''} src={me?.avatarUrl ?? null} size={36} />
      <div className={styles.composerBody}>
        <div className={styles.types}>
          {COMMENT_TYPES.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={type === k}
              className={`${styles.type} ${type === k ? styles[`on_${COMMENT_TONE[k]}`] : ''}`}
              onClick={() => setType(k)}
            >
              {t(k)}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          className={styles.textarea}
          value={draft}
          aria-label={t('title')}
          placeholder={t(PH_KEY[type])}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className={styles.composerFoot}>
          <span className={styles.hint}>{t('hint')}</span>
          <button
            type="button"
            className={styles.primary}
            onClick={() => onPost(type, draft, () => setDraft(''))}
          >
            {t('post')}
          </button>
        </div>
      </div>
    </div>
  );
}
