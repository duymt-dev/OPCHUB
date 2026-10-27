import { Icon } from '../../icons';
import styles from './type-choice.module.css';
import { keepAnchor } from '../keep-anchor';

export type RegisterKind = 'biz' | 'per';

export interface TypeCard {
  kind: RegisterKind;
  title: string;
  desc: string;
}

const KIND_ICON = { biz: 'building', per: 'user' } as const;

/** A-10: "BẠN ĐĂNG KÝ VỚI TƯ CÁCH" — hai thẻ Doanh nghiệp / Cá nhân */
export function TypeChoice({
  title,
  chooseLabel,
  cards,
  selected,
  onPick,
}: {
  title: string;
  chooseLabel: string;
  cards: TypeCard[];
  selected?: RegisterKind | undefined;
  onPick: (kind: RegisterKind) => void;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{title}</div>
      <div className={styles.grid}>
        {cards.map((c) => (
          <button
            key={c.kind}
            type="button"
            aria-pressed={c.kind === selected}
            className={styles.card}
            onMouseDown={keepAnchor}
            onClick={() => onPick(c.kind)}
          >
            <span className={styles.icon}>
              <Icon name={KIND_ICON[c.kind]} size={26} />
            </span>
            <span className={styles.cardTitle}>{c.title}</span>
            <span className={styles.desc}>{c.desc}</span>
            <span className={styles.choose}>
              {chooseLabel} <Icon name="arrowRight" size={14} strokeWidth={2.2} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Dải xanh đầu form: loại tài khoản + "Đổi loại" */
export function TypeBanner({
  kind,
  title,
  sub,
  changeLabel,
  onChange,
}: {
  kind: RegisterKind;
  title: string;
  sub: string;
  changeLabel: string;
  onChange: () => void;
}) {
  return (
    <div className={styles.banner}>
      <span className={styles.badge}>
        <Icon name={KIND_ICON[kind]} size={20} />
      </span>
      <span className={styles.bannerText}>
        <span className={styles.bannerTitle}>{title}</span>
        <span className={styles.bannerSub}>{sub}</span>
      </span>
      <button type="button" className={styles.change} onMouseDown={keepAnchor} onClick={onChange}>
        {changeLabel}
      </button>
    </div>
  );
}
