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
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { to: '/', label: 'Dashboard', icon: HiOutlineHome, cmd: 'HOME' },
  { to: '/accounts', label: 'Accounts', icon: HiOutlineCreditCard, cmd: 'ACCOUNTS' },
  { to: '/transactions', label: 'Transactions', icon: HiOutlineCurrencyRupee, cmd: 'TXNS' },
  { to: '/categories', label: 'Categories', icon: HiOutlineTag, cmd: 'CATEGORIES' },
  { to: '/budgets', label: 'Budgets', icon: HiOutlineCollection, cmd: 'BUDGETS' },
  { to: '/reports', label: 'Reports', icon: HiOutlineChartPie, cmd: 'REPORTS' },
  { to: '/settings', label: 'Settings', icon: HiOutlineCog, cmd: 'SETTINGS' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { userData } = useAuth();
  const { theme } = useTheme();

  {/* CYBERPUNK THEME */}
  if (theme === 'cyberpunk') {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={onClose}
          />
        )}
        <aside
          style={{
            background: '#000000',
            borderRight: '1px solid rgba(0,255,65,0.3)',
            fontFamily: "'Courier New', Courier, monospace",
            width: '224px',
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100%',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
          }}
          className="lg:translate-x-0 lg:static lg:w-56 lg:min-h-screen"
        >
          {/* Logo */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,255,65,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#00FF41', fontSize: '13px', letterSpacing: '0.08em' }}>
              &gt; EXPENSE_TRACKER
            </span>
            <button
              onClick={onClose}
              className="lg:hidden"
              style={{ background: 'transparent', border: 'none', color: '#008F11', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>

          {/* User info */}
          {userData && (
            <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,255,65,0.15)', color: '#00CC33', fontSize: '11px', letterSpacing: '0.06em' }}>
              <div style={{ color: '#00FF41' }}>USER: {userData.displayName?.toUpperCase() || 'UNKNOWN'}</div>
              <div style={{ color: '#008F11', marginTop: '2px' }}>{userData.email}</div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
            {navItems.map(({ to, cmd }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '8px 10px',
                  color: isActive ? '#FF00FF' : '#00CC33',
                  fontSize: '13px',
                  letterSpacing: '0.06em',
                  textDecoration: 'none',
                  borderLeft: isActive ? '2px solid #FF00FF' : '2px solid transparent',
                  background: isActive ? 'rgba(255,0,255,0.08)' : 'transparent',
                  marginBottom: '2px',
                })}
              >
                {({ isActive }) => (
                  <span>{isActive ? '>> ' : '> '}{cmd}{isActive ? ' [ACTIVE]' : ''}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,255,65,0.15)', color: '#008F11', fontSize: '10px', letterSpacing: '0.06em', textAlign: 'center' }}>
            v1.0 // EXPENSE_TRACKER
          </div>
        </aside>
      </>
    );
  }

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
