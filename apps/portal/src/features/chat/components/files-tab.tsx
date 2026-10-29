'use client';

import { type GroupFile, type GroupFileKind } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { extTone, fileTime } from '../format';
import { useGroupFiles } from '../hooks/use-chat-data';
import { useFileDownload } from '../hooks/use-file-download';
import styles from './files-tab.module.css';

interface Props {
  groupId: string;
  groupName: string;
  onOpenRoom: (key: string) => void;
}

const KINDS: readonly { kind: GroupFileKind; label: 'kindAll' | 'kindDoc' | 'kindImg' }[] = [
  { kind: 'all', label: 'kindAll' },
  { kind: 'doc', label: 'kindDoc' },
  { kind: 'img', label: 'kindImg' },
];

/**
 * D-98 / §27.7 tab "File chia sẻ": file + ảnh mọi chủ đề của nhóm (chỉ thành viên), tìm theo tên tệp / người gửi,
 * chip đếm theo toàn bộ, bấm "# chủ đề" mở chủ đề gốc, "Tải về" xin link ký mới (D-117 B6). Trang sau tải khi cuộn.
 */
export function FilesTab({ groupId, groupName, onOpenRoom }: Props) {
  const t = useTranslations('chat.panel');
  const [kind, setKind] = useState<GroupFileKind>('all');
  const [q, setQ] = useState('');
  const query = useGroupFiles(groupId, kind, q.trim());
  const pages = query.data?.pages ?? [];
  const files = pages.flatMap((p) => p.items);
  const counts = pages[0]?.counts ?? { all: 0, doc: 0, img: 0 };
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return undefined;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <div className={styles.intro}>
        {t.rich('filesIntro', { group: groupName, b: (c) => <b>{c}</b> })}
      </div>
      <input
        className={styles.search}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('filesSearch')}
        aria-label={t('filesSearch')}
        maxLength={100}
      />
      <div className={styles.chips}>
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            className={styles.chip}
            aria-pressed={kind === k.kind}
            onClick={() => setKind(k.kind)}
          >
            {t(k.label, { n: counts[k.kind] })}
          </button>
        ))}
      </div>
      {files.map((f) => (
        <FileRow key={f.messageId} f={f} onOpenRoom={onOpenRoom} />
      ))}
      {query.isSuccess && !files.length ? <div className={styles.empty}>{t('noFiles')}</div> : null}
      <div ref={sentinel} className={styles.sentinel} />
    </>
  );
}

function FileRow({ f, onOpenRoom }: { f: GroupFile; onOpenRoom: (key: string) => void }) {
  const t = useTranslations('chat.panel');
  const download = useFileDownload();
  const image = f.kind === 'img';
  return (
    <div className={styles.file} data-testid="group-file">
      <div className={styles.head}>
        <span className={styles.ext} data-tone={extTone(f.ext, image)}>
          {image ? t('imageExt') : f.ext}
        </span>
        <div className={styles.col}>
          <span className={styles.name} title={f.name}>
            {f.name}
          </span>
          <span className={styles.small}>
            {image ? t('imageSize') : f.size} · {f.sender}
          </span>
        </div>
      </div>
      <div className={styles.meta}>
        <button type="button" className={styles.topic} onClick={() => onOpenRoom(f.roomKey)}>
          # {f.roomName}
        </button>
        <span className={styles.time}>· {fileTime(f.createdAt)}</span>
        <a
          className={styles.dl}
          href={f.url ?? '#'}
          download={f.name}
          rel="noopener noreferrer"
          onClick={(e) => void download(e, f.messageId)}
        >
          {t('download')}
        </a>
      </div>
    </div>
  );
}
