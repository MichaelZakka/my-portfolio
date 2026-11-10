import type { Metadata } from 'next';
import styles from '../../admin.module.css';
import ContentNav from './ContentNav';

export const metadata: Metadata = { title: 'Content' };

/** Every page below checks the admin session itself (layouts alone are not enough). */
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Content</h1>
        <p className={styles.pageSubtitle}>
          Everything visitors read on the portfolio, in English and Arabic. Saved changes go live on the next page load.
        </p>
      </div>
      <ContentNav />
      {children}
    </div>
  );
}
