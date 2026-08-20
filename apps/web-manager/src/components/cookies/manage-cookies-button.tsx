'use client';

import { openCookieSettings } from '@/lib/consent';
import styles from './cookies.module.css';

export function ManageCookiesButton({
  variant = 'link',
}: {
  variant?: 'link' | 'inline' | 'footer';
}) {
  const className =
    variant === 'inline' ? styles.inline : variant === 'footer' ? styles.footerItem : undefined;

  return (
    <button type="button" className={className} onClick={() => openCookieSettings()}>
      Gérer les cookies
    </button>
  );
}
