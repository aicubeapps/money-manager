import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import { toast } from '../components/common/Toast';

const FEATURES = [
  { icon: '📊', text: 'Track income & expenses' },
  { icon: '🎯', text: 'Set category budgets' },
  { icon: '📈', text: 'Visualize spending trends' },
  { icon: '🏦', text: 'Manage multiple accounts' },
];

const LoginPage = () => {
  const { signInWithGoogle, currentUser, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate('/', { replace: true });
  }, [currentUser, navigate]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error(error);
      toast.error('Sign-in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950 p-4 transition-colors">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <HiOutlineSun className="w-5 h-5 text-amber-400" />
        ) : (
          <HiOutlineMoon className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
            <span className="text-white text-3xl font-bold">₹</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            ExpenseTracker
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            Take control of your finances
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Sign in to manage your expenses
          </p>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle className="w-5 h-5 flex-shrink-0" />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="mt-6 space-y-2.5">
            {FEATURES.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="text-base">{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-5">
          By signing in, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
