import type { Metadata } from 'next';
import AdminMain from '../_components/AdminMain';
import Sidebar from '../_components/Sidebar';
import styles from '../admin.module.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <AdminMain>{children}</AdminMain>
    </div>
  );
}
