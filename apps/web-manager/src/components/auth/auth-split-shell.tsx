'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ManageCookiesButton } from '@/components/cookies/manage-cookies-button';
import { AUTH_VISUAL_IMAGES, type AuthVisual } from './auth-copy';
import styles from './auth-shell.module.css';

type AuthSplitShellProps = {
  visual: AuthVisual;
  visualKey: string;
  toolbar?: ReactNode;
  dots?: { key: string; label: string; active: boolean; onSelect: () => void }[];
  children: ReactNode;
};

export function AuthSplitShell({ visual, visualKey, toolbar, dots, children }: AuthSplitShellProps) {
  return (
    <main className={`${styles.page} auth-viewport`}>
      <div className={styles.card}>
        <section className={styles.panel}>
          <div className={styles.panelBrand}>
            <Link href="/" className={styles.brand} aria-label="Eveider, accueil">
              <img
                src="/landing/eveider_logo.png"
                alt=""
                width={60}
                height={40}
                className={styles.brandMark}
              />
              Eveider
            </Link>
          </div>
          <div className={styles.panelMain}>
            {toolbar ? <div className={styles.formToolbar}>{toolbar}</div> : null}
            <div className={styles.formSlot}>
              <div className={styles.formCard}>{children}</div>
            </div>
          </div>
          <footer className={styles.panelFoot}>
            <span>© {new Date().getFullYear()} Eveider</span>
            <span className={styles.panelFootLinks}>
              <Link href="/cookies">Cookies</Link>
              <ManageCookiesButton variant="footer" />
              <Link href="/suivi">Suivre un colis</Link>
            </span>
          </footer>
        </section>

        <aside className={styles.visualWrap}>
          <div className={styles.visual}>
            <div className={styles.visualMedia}>
              {AUTH_VISUAL_IMAGES.map((src) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  fill
                  priority={src === visual.image}
                  sizes="(max-width: 900px) 100vw, 58vw"
                  className={
                    src === visual.image
                      ? `${styles.visualImage} ${styles.visualImageOn}`
                      : `${styles.visualImage} ${styles.visualImageOff}`
                  }
                />
              ))}
              <div className={styles.visualShade} />
            </div>

            <div className={styles.visualCopy}>
              <div key={visualKey} className={styles.visualCopyInner}>
                {visual.kicker ? <p className={styles.kicker}>{visual.kicker}</p> : null}
                <h2 className={styles.visualTitle}>{visual.title}</h2>
                <p className={styles.visualBody}>{visual.body}</p>
              </div>
              {dots && dots.length > 1 ? (
                <div className={styles.dots} role="tablist" aria-label="Types de compte">
                  {dots.map((dot) => (
                    <button
                      key={dot.key}
                      type="button"
                      className={dot.active ? `${styles.dot} ${styles.dotActive}` : styles.dot}
                      aria-label={dot.label}
                      aria-current={dot.active ? 'true' : undefined}
                      onClick={dot.onSelect}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
