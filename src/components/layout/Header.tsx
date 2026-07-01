import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { HiOutlineMenu, HiOutlineMoon, HiOutlineSun, HiOutlineLogout } from 'react-icons/hi';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { userData, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <HiOutlineMenu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">₹</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight hidden sm:block">
            ExpenseTracker
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <HiOutlineSun className="w-5 h-5 text-amber-400" />
          ) : (
            <HiOutlineMoon className="w-5 h-5 text-gray-600" />
          )}
        </button>

        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label="Logout"
          title="Sign out"
        >
          <HiOutlineLogout className="w-5 h-5" />
        </button>

        {userData && (
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-200 dark:border-gray-700">
            {userData.photoURL ? (
              <img
                src={userData.photoURL}
                alt={userData.displayName}
                className="w-8 h-8 rounded-full ring-2 ring-primary-100 dark:ring-primary-900"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold">
                {userData.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-sm font-medium hidden md:inline text-gray-700 dark:text-gray-300">
              {userData.displayName?.split(' ')[0]}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
