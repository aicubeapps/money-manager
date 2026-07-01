import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineCreditCard,
  HiOutlineCurrencyRupee,
  HiOutlineTag,
  HiOutlineChartPie,
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineX,
} from 'react-icons/hi';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: HiOutlineHome },
  { to: '/accounts', label: 'Accounts', icon: HiOutlineCreditCard },
  { to: '/transactions', label: 'Transactions', icon: HiOutlineCurrencyRupee },
  { to: '/categories', label: 'Categories', icon: HiOutlineTag },
  { to: '/budgets', label: 'Budgets', icon: HiOutlineCollection },
  { to: '/reports', label: 'Reports', icon: HiOutlineChartPie },
  { to: '/settings', label: 'Settings', icon: HiOutlineCog },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { userData } = useAuth();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/80 z-50
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:w-64 lg:min-h-screen
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">₹</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">ExpenseTracker</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        </div>

        {/* User info */}
        {userData && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              {userData.photoURL ? (
                <img src={userData.photoURL} alt={userData.displayName} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold">
                  {userData.displayName?.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userData.displayName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userData.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs text-gray-400 dark:text-gray-600 text-center">v1.0 · ExpenseTracker</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
