'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import styles from '../portal.module.css';

/** Toggles English/Arabic. A full reload re-renders <html lang dir> and the fonts in one go. */
export default function LanguageSwitch() {
  const t = useTranslations('portal.common');
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const next = locale === 'ar' ? 'en' : 'ar';

  const handleClick = async () => {
    setPending(true);
    try {
      await fetch('/api/portal/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
    } finally {
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      className={styles.ghostButton}
      onClick={handleClick}
      disabled={pending}
      lang={next}
      aria-label={t('switchLanguageLabel')}
    >
      {t('switchLanguage')}
    </button>
  );
}
