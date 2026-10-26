import { EuFlag, ValueIcon } from './auth-icons';
import styles from './auth-hero.module.css';
import type { AuthFooterProps, AuthHeroProps } from './types';

/** Cột trái màn Auth v4: huy hiệu, tiêu đề 2 dòng, mô tả, 4 giá trị có icon tròn */
export function AuthHero({ copy }: AuthHeroProps) {
  return (
    <div className={styles.hero}>
      <span className={styles.eyebrow}>{copy.eyebrow}</span>
      <h1 className={styles.headline}>
        {copy.headlineLead}
        <br />
        {copy.headlinePre} <span className={styles.accent}>{copy.headlineAccent}</span>
      </h1>
      <p className={styles.sub}>{copy.sub}</p>
      <div className={styles.values}>
        {copy.values.map((v) => (
          <div key={v.icon} className={styles.value}>
            <span className={styles.valueIcon}>
              <ValueIcon name={v.icon} />
            </span>
            <span className={styles.valueText}>
              <span>{v.lines[0]}</span>
              <span>{v.lines[1]}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chân trang Auth v4 */
export function AuthFooter({ flags, tagline, copyright, terms, privacy }: AuthFooterProps) {
  return (
    <div className={styles.footer}>
      <div className={styles.footLeft}>
        <div className={styles.flags}>
          {flags.map((f) => (
            <img key={f.code} src={f.src} alt={f.code} />
          ))}
          <EuFlag />
        </div>
        <span className={styles.tagline}>{tagline}</span>
      </div>
      <div className={styles.footRight}>
        <span>{copyright}</span>
        <span className={styles.links}>
          <span>{terms}</span>|<span>{privacy}</span>
        </span>
      </div>
    </div>
  );
}
