import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { HiOutlineMoon, HiOutlineSun, HiOutlineLogout, HiOutlineUser, HiOutlineShieldCheck, HiOutlineTag, HiChevronRight } from 'react-icons/hi';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { userData, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your preferences</p>
      </div>

      {/* Profile */}
      {userData && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <HiOutlineUser className="w-4 h-4" /> Profile
          </h2>
          <div className="flex items-center gap-4">
            {userData.photoURL ? (
              <img src={userData.photoURL} alt={userData.displayName} className="w-14 h-14 rounded-full ring-2 ring-primary-100 dark:ring-primary-900" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
                {userData.displayName?.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{userData.displayName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Member since {(
                  (userData.createdAt as any)?.toDate
                    ? (userData.createdAt as any).toDate()
                    : new Date(userData.createdAt)
                ).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appearance */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <HiOutlineMoon className="w-5 h-5 text-primary-500" />
            ) : (
              <HiOutlineSun className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {theme === 'dark' ? 'Using dark theme' : 'Using light theme'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-primary-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineTag className="w-4 h-4" /> Tags
        </h2>
        <Link
          to="/settings/tags"
          className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Tags</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Manage tags and their default account/category
            </div>
          </div>
          <HiChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
      </div>

      {/* Security */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineShieldCheck className="w-4 h-4" /> Security
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Your data is secured with Google authentication. All financial data is stored securely in Firestore.
        </div>
      </div>

      {/* Sign out */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Account</h2>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm"
        >
          <HiOutlineLogout className="w-4 h-4" />
          Sign out
        </button>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-600 text-center pb-4">
        ExpenseTracker v1.0 · Built with React & Firebase
      </div>
    </div>
  );
};

export default SettingsPage;
