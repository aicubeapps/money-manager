import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import FloatingActionButton from '../common/FloatingActionButton';
import BottomNav from './BottomNav';
import { useAuth } from '../../hooks/useAuth';
import { hasConnectedBefore, reconnectDriveSilently } from '../../services/googleDriveService';
import { shouldRunAutoBackup, uploadBackup } from '../../services/backupService';
import { toast } from '../common/Toast';

const FAB_ROUTES = ['/', '/accounts', '/transactions'];

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { currentUser } = useAuth();
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // Automated weekly backup check: only runs when the app is opened (no true
  // background process), only if Drive was connected before, and only if
  // 7+ days have passed since the last backup. Silent re-auth (no popup,
  // valid because the user already granted consent previously) + a quiet,
  // non-blocking toast — never interrupts the UI, failures are logged only.
  useEffect(() => {
    if (!currentUser) return;
    if (!hasConnectedBefore() || !shouldRunAutoBackup()) return;

    let cancelled = false;
    (async () => {
      const reauthed = await reconnectDriveSilently();
      if (cancelled || !reauthed) return;
      try {
        await uploadBackup(currentUser.uid);
        if (!cancelled) toast.success('Weekly backup uploaded to Google Drive');
      } catch (err) {
        console.error('Automated backup failed:', err);
        if (!cancelled) toast.error('Weekly backup failed');
      }
    })();

    return () => { cancelled = true; };
  }, [currentUser]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-6 lg:p-6">
          <Outlet />
        </main>
        {FAB_ROUTES.includes(pathname) && <FloatingActionButton />}
          <BottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
