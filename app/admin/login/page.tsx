import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './LoginForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin login</h1>
        <p className={styles.subtitle}>Sign in to manage requests and analytics.</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
