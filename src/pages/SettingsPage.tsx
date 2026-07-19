import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { HiOutlineLogout, HiOutlineUser, HiOutlineShieldCheck, HiOutlineTag, HiChevronRight } from 'react-icons/hi';

const THEME_OPTIONS: { value: Theme; label: string; description: string; swatch: string }[] = [
  { value: 'light', label: 'Light', description: 'Clean light interface', swatch: 'bg-white border-gray-300' },
  { value: 'dark', label: 'Dark', description: 'Dark interface for low-light environments', swatch: 'bg-gray-900 border-gray-600' },
  { value: 'oled', label: 'OLED Pure Black', description: 'True black for OLED displays', swatch: 'bg-black border-gray-700' },
  { value: 'cyberpunk', label: 'CYBERPUNK [TERMINAL]', description: 'Green-on-black terminal aesthetic', swatch: 'bg-black border-green-400' },
];

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { userData, logout } = useAuth();

  const isCyberpunk = theme === 'cyberpunk';

  if (isCyberpunk) {
    const cpFont: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" };
    return (
      <div style={{ ...cpFont, color: '#00FF41', maxWidth: '640px' }} className="space-y-6 animate-fade-in">
        <div>
          <div style={{ fontSize: '18px', letterSpacing: '0.08em' }}>[SETTINGS]</div>
          <div style={{ fontSize: '11px', color: '#008F11', letterSpacing: '0.06em' }}>MANAGE_PREFERENCES</div>
        </div>

        {/* Profile */}
        {userData && (
          <div style={{ background: '#000000', border: '1px solid rgba(0,255,65,0.25)', padding: '16px' }}>
            <div style={{ color: '#008F11', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '12px' }}>[PROFILE]</div>
            <div style={{ color: '#00FF41', letterSpacing: '0.06em' }}>USER: {userData.displayName?.toUpperCase()}</div>
            <div style={{ color: '#008F11', fontSize: '11px', marginTop: '4px' }}>{userData.email}</div>
          </div>
        )}

        {/* Appearance */}
        <div style={{ background: '#000000', border: '1px solid rgba(0,255,65,0.25)', padding: '16px' }}>
          <div style={{ color: '#008F11', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '12px' }}>[APPEARANCE // THEME_SELECT]</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: '#000000',
                  border: theme === opt.value ? '1px solid #FF00FF' : '1px solid rgba(0,255,65,0.25)',
                  color: theme === opt.value ? '#FF00FF' : '#00CC33',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ display: 'inline-block', width: '20px', height: '20px', border: theme === opt.value ? '2px solid #FF00FF' : '2px solid rgba(0,255,65,0.4)', background: opt.value === 'light' ? '#ffffff' : opt.value === 'dark' ? '#111827' : '#000000' }} />
                <span>
                  {theme === opt.value ? '>> ' : '> '}{opt.label}
                  {theme === opt.value && <span style={{ color: '#FF00FF', marginLeft: '8px' }}>[ACTIVE]</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={{ background: '#000000', border: '1px solid rgba(0,255,65,0.25)', padding: '16px' }}>
          <div style={{ color: '#008F11', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '12px' }}>[TAGS]</div>
          <Link to="/settings/tags" style={{ color: '#00FFFF', fontSize: '12px', letterSpacing: '0.06em', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>&gt; MANAGE_TAGS</span>
            <span style={{ color: '#008F11' }}>[→]</span>
          </Link>
        </div>

        {/* Security */}
        <div style={{ background: '#000000', border: '1px solid rgba(0,255,65,0.25)', padding: '16px' }}>
          <div style={{ color: '#008F11', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '8px' }}>[SECURITY]</div>
          <div style={{ color: '#00CC33', fontSize: '11px', lineHeight: '1.6' }}>
            AUTH: [GOOGLE] // STORAGE: [FIRESTORE] // STATUS: [SECURE]
          </div>
        </div>

        {/* Sign out */}
        <div style={{ background: '#000000', border: '1px solid rgba(0,255,65,0.25)', padding: '16px' }}>
          <div style={{ color: '#008F11', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '12px' }}>[ACCOUNT]</div>
          <button
            onClick={logout}
            style={{
              background: '#000000',
              border: '1px solid rgba(255,0,64,0.5)',
              color: '#FF0040',
              padding: '6px 16px',
              fontSize: '12px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            [LOGOUT] // TERMINATE_SESSION
          </button>
        </div>

        <div style={{ color: '#008F11', fontSize: '10px', textAlign: 'center', letterSpacing: '0.06em' }}>
          EXPENSE_TRACKER v1.0 // REACT + FIREBASE
        </div>
      </div>
    );
  }

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
        <div className="space-y-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 text-left ${
                theme === opt.value
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className={`w-8 h-8 rounded border-2 flex-shrink-0 ${opt.swatch}`} />
              <div className="flex-1">
                <div className={`font-medium text-sm ${theme === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</div>
              </div>
              {theme === opt.value && (
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
              )}
            </button>
          ))}
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
