import styles from './auth-hero.module.css';
import type { AuthHeroProps } from './types';

/** Cột trái màn Auth: logo, số người online, thông điệp, ảnh, số liệu, trích dẫn, cờ quốc gia */
export function AuthHero({ logoSrc, online, copy, quote, images, flags }: AuthHeroProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.topRow}>
        <img className={styles.logo} src={logoSrc} alt={copy.logoAlt} />
        <span className={styles.online}>
          <i className={styles.dot} />
          {online} {copy.onlineSuffix}
        </span>
      </div>

      <div className={styles.intro}>
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <div className={styles.headline}>
          {copy.headlineLead} <span className={styles.accent}>{copy.headlineAccent}</span>.
        </div>
        <div className={styles.sub}>{copy.sub}</div>
      </div>

      <div className={styles.gallery}>
        <div className={`${styles.photo} ${styles.photoMain}`}>
          <img src={images.main} alt="" />
        </div>
        <div className={styles.photo}>
          <img src={images.side} alt="" />
        </div>
        <div className={styles.newCard}>
          <div className={styles.avatars}>
            {images.avatars.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
          <div className={styles.newText}>
            <b>{copy.newMembersCount}</b>
            <span>{copy.newMembersLabel}</span>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        {copy.stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.quote}>
        <img className={styles.quoteImg} src={quote.img} alt="" />
        <div className={styles.quoteBody}>
          <div className={styles.quoteText}>“{quote.text}”</div>
          <div className={styles.quoteBy}>
            <b>{quote.name}</b> · {quote.role}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.flagsRow}>
          <span className={styles.muted}>{copy.presentIn}</span>
          <div className={styles.flags}>
            {flags.map((f) => (
              <img key={f.code} src={f.src} alt={f.code} />
            ))}
          </div>
        </div>
        <span className={styles.muted}>{copy.copyright}</span>
      </div>
    </div>
  );
}
