import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import FloatingActionButton from '../common/FloatingActionButton';
import BottomNav from './BottomNav';

const FAB_ROUTES = ['/', '/accounts', '/transactions'];

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

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
