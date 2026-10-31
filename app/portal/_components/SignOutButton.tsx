'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import styles from '../portal.module.css';

export default function SignOutButton() {
  const t = useTranslations('portal.common');
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await fetch('/api/portal/auth/logout', { method: 'POST' });
    } finally {
      // Full navigation so no signed-in page stays in the client router cache.
      window.location.assign('/portal/login');
    }
  };

  return (
    <button type="button" className={styles.ghostButton} onClick={handleClick} disabled={pending}>
      <LogOut size={16} strokeWidth={2} aria-hidden="true" className="flip-rtl" />
      {pending ? t('signingOut') : t('signOut')}
    </button>
  );
}
