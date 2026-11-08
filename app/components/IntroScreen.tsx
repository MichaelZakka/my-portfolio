import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import styles from './IntroScreen.module.css';

/** sessionStorage key: the intro plays once per browser tab session. */
const SEEN_KEY = 'mz-intro';
/** When the curtain starts to lift; keep in step with the timeline in IntroScreen.module.css. */
const EXIT_AT_MS = 2650;
/** Length of the `.intro` lift animation. */
const LEAVE_MS = 800;

/**
 * Runs while the HTML is parsed, before first paint, so returning visitors never see a
 * flash of the intro and it doesn't wait for hydration. It drives <html data-intro>:
 *   (absent) → no intro (already seen, reduced motion, storage blocked, or no JS)
 *   play     → intro on screen; the hero's entrance animations are paused
 *   leave    → curtain lifts, hero animations run
 *   done     → intro hidden
 * Any key, click, tap or wheel skips straight to `leave`.
 */
const BOOT_SCRIPT = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem('${SEEN_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;sessionStorage.setItem('${SEEN_KEY}','1')}catch(e){return}d.setAttribute('data-intro','play');var ev=['keydown','pointerdown','touchstart','wheel'],t=setTimeout(end,${EXIT_AT_MS});ev.forEach(function(e){addEventListener(e,end,{passive:true})});function end(){clearTimeout(t);ev.forEach(function(e){removeEventListener(e,end)});if(d.getAttribute('data-intro')!=='play')return;d.setAttribute('data-intro','leave');setTimeout(function(){d.setAttribute('data-intro','done')},${LEAVE_MS})}})()`;

/** Status lines printed under `npm run portfolio`. */
const LOG_LINES = ['loading projects', 'rtl + ltr layouts', 'performance budget'];

type Piece = { text: string; i: number };

/**
 * Latin names animate letter by letter. Arabic letters join, so splitting them into
 * separate boxes would break the word shapes; those names animate word by word.
 */
function splitName(name: string): Piece[][] {
  const perLetter = /^[\u0000-ɏ\s]+$/.test(name);
  // Stagger index per piece; whole words get a wider gap so the name still builds up
  const step = perLetter ? 1 : 4;
  let i = 0;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      (perLetter ? Array.from(word) : [word]).map((text) => {
        const piece = { text, i };
        i += step;
        return piece;
      })
    );
}

const vars = (v: Record<string, number>) => v as CSSProperties;

export default function IntroScreen({ locale, dir }: { locale: string; dir: 'ltr' | 'rtl' }) {
  const t = useTranslations('intro');
  const name = useTranslations('hero')('name');
  // Short title, same as the hero ("Web Developer"), without the "(React / Next.js)" part
  const role = useTranslations('meta')('jobTitle').replace(/\s*\([^)]*\)/, '');
  const words = splitName(name);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      {/* Decorative: the real page is already rendered and readable underneath */}
      <div className={styles.intro} aria-hidden="true">
        <div className={styles.window} dir="ltr" lang="en">
          <div className={styles.bar}>
            <span className={styles.dots}>
              <i />
              <i />
              <i />
            </span>
            <span className={styles.barTitle}>michael@zakka: ~/portfolio</span>
          </div>

          <div className={styles.body}>
            <p className={`${styles.line} ${styles.cmd1}`}>
              <span className={styles.sign}>$</span>
              <span className={styles.typed} style={vars({ '--n': 6 })}>
                whoami
              </span>
              <i className={styles.caret} />
            </p>

            <p className={styles.name} lang={locale} dir={dir}>
              {words.map((pieces, w) => (
                <span key={w} className={styles.word}>
                  {pieces.map(({ text, i }) => (
                    <span key={i} className={styles.char} style={vars({ '--i': i })}>
                      {text}
                    </span>
                  ))}
                </span>
              ))}
            </p>
            <p className={styles.role} lang={locale} dir={dir}>
              {role}
            </p>

            <p className={`${styles.line} ${styles.cmd2}`}>
              <span className={styles.sign}>$</span>
              <span className={styles.typed} style={vars({ '--n': 17 })}>
                npm run portfolio
              </span>
              <i className={styles.caret} />
            </p>

            <ul className={styles.log}>
              {LOG_LINES.map((label, i) => (
                <li key={label} style={vars({ '--i': i })}>
                  <span className={styles.arrow}>▸</span>
                  {label}
                  <span className={styles.leader} />
                  <span className={styles.ok}>ok</span>
                </li>
              ))}
            </ul>

            <div className={styles.progress}>
              <span className={styles.track}>
                <span className={styles.fill} />
              </span>
              <span className={styles.pct} />
            </div>

            <p className={`${styles.line} ${styles.ready}`}>
              <span className={styles.check}>✓</span> ready
              <i className={`${styles.caret} ${styles.caretIdle}`} />
            </p>
          </div>
        </div>

        <p className={styles.skip} lang={locale}>
          <span className={styles.skipPointer}>{t('skip')}</span>
          <span className={styles.skipTouch}>{t('skipTouch')}</span>
        </p>
      </div>
    </>
  );
}
