import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useCurrency } from '../context/CurrencyContext';
import { HiOutlineLogout, HiOutlineUser, HiOutlineShieldCheck, HiOutlineTag, HiOutlineRefresh, HiOutlineInformationCircle, HiOutlineCurrencyDollar, HiChevronRight, HiOutlineCloudUpload, HiOutlineCloud, HiOutlineColorSwatch } from 'react-icons/hi';
import type { Theme } from '../context/ThemeContext';
import RecurringRulesList from '../components/settings/RecurringRulesList';
import { FIAT_CURRENCIES, CRYPTO_CURRENCIES } from '../services/currencyService';
import { connectDrive, disconnectDrive, isDriveConnected, hasConnectedBefore, reconnectDriveSilently } from '../services/googleDriveService';
import { uploadBackup, listBackups, previewBackup, restoreFromBackup, getLastBackupAt, type BackupSummary, type RestorePreview } from '../services/backupService';
import { toast } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const formatLastUpdated = (timestamp: number | null) => {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString();
};

const formatBackupDate = (date: Date | null) => {
  if (!date) return 'Never';
  return date.toLocaleString();
};

const THEME_OPTIONS: { value: Theme; label: string; icon: string; desc: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️', desc: 'Clean light interface' },
  { value: 'dark', label: 'Dark', icon: '🌙', desc: 'Easy on the eyes' },
  { value: 'oled', label: 'OLED Black', icon: '⬛', desc: 'True black for OLED screens' },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: '⚡', desc: 'Neon terminal aesthetic' },
];

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { userData, currentUser, logout } = useAuth();
  const {
    enabled: currencyEnabled,
    setEnabled: setCurrencyEnabled,
    targetCurrency,
    setTargetCurrency,
    lastUpdated,
    loading: ratesLoading,
    error: ratesError,
    refresh: refreshRates,
  } = useCurrency();

  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<Date | null>(getLastBackupAt());
  const [restoreTarget, setRestoreTarget] = useState<{ file: BackupSummary; preview: RestorePreview } | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (isDriveConnected()) {
        if (!cancelled) setDriveStatus('connected');
        return;
      }
      if (hasConnectedBefore()) {
        const ok = await reconnectDriveSilently();
        if (!cancelled) setDriveStatus(ok ? 'connected' : 'disconnected');
        return;
      }
      if (!cancelled) setDriveStatus('disconnected');
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const refreshBackups = async () => {
    setBackupsLoading(true);
    try {
      const list = await listBackups();
      setBackups(list);
    } catch (err) {
      console.error('Error listing backups:', err);
      toast.error('Failed to load backup list');
    } finally {
      setBackupsLoading(false);
    }
  };

  useEffect(() => {
    if (driveStatus === 'connected') refreshBackups();
  }, [driveStatus]);

  const handleConnectDrive = async () => {
    const ok = await connectDrive();
    if (ok) {
      setDriveStatus('connected');
      toast.success('Google Drive connected');
    } else {
      toast.error('Could not connect to Google Drive');
    }
  };

  const handleDisconnectDrive = () => {
    disconnectDrive();
    setDriveStatus('disconnected');
    setBackups([]);
  };

  const handleBackupNow = async () => {
    if (!currentUser) return;
    setBackingUp(true);
    try {
      await uploadBackup(currentUser.uid);
      setLastBackupAt(getLastBackupAt());
      toast.success('Backup uploaded to Google Drive');
      await refreshBackups();
    } catch (err) {
      console.error('Error uploading backup:', err);
      toast.error('Backup failed — please try again');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreClick = async (file: BackupSummary) => {
    try {
      const preview = await previewBackup(file.fileId);
      setRestoreTarget({ file, preview });
    } catch (err) {
      console.error('Error reading backup:', err);
      toast.error('Failed to read that backup file');
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget || !currentUser) return;
    setRestoring(true);
    try {
      await restoreFromBackup(currentUser.uid, restoreTarget.preview.payload);
      toast.success('Backup restored — reloading app...');
      setRestoreTarget(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error('Error restoring backup:', err);
      toast.error('Restore failed — your existing data may be partially affected');
    } finally {
      setRestoring(false);
    }
  };

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
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineColorSwatch className="w-4 h-4" /> Appearance
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon, desc }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                theme === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className={`text-sm font-semibold ${theme === value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                {label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Display Currency */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineCurrencyDollar className="w-4 h-4" /> Display Currency
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          All amounts are stored and entered in INR. This only changes how they're
          <em> displayed</em> — using a cached exchange rate, not a live rate at the
          time of each transaction.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Show converted values</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currencyEnabled ? `Showing amounts in ${targetCurrency}` : 'Showing amounts in INR'}
            </div>
          </div>
          <button
            onClick={() => setCurrencyEnabled(!currencyEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${currencyEnabled ? 'bg-primary-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${currencyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {currencyEnabled && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="form-label">Currency</label>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="form-input"
              >
                <optgroup label="Fiat">
                  {FIAT_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Crypto">
                  {CRYPTO_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {ratesError ? (
                  <span className="text-amber-600 dark:text-amber-400">{ratesError}</span>
                ) : (
                  <>Rates last updated: {formatLastUpdated(lastUpdated)}</>
                )}
              </span>
              <button
                onClick={() => refreshRates()}
                disabled={ratesLoading}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50"
              >
                <HiOutlineRefresh className={`w-3.5 h-3.5 ${ratesLoading ? 'animate-spin' : ''}`} />
                {ratesLoading ? 'Refreshing...' : 'Refresh now'}
              </button>
            </div>
          </div>
        )}
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

      {/* Recurring Transactions */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineRefresh className="w-4 h-4" /> Recurring Transactions
        </h2>
        <RecurringRulesList />
      </div>

      {/* Backup */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineCloud className="w-4 h-4" /> Backup
        </h2>

        {driveStatus === 'checking' ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Checking Google Drive connection...</div>
        ) : driveStatus === 'disconnected' ? (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Connect Google Drive to back up your accounts, transactions, categories, budgets, and tags.
            </p>
            <button onClick={handleConnectDrive} className="btn-primary text-sm">
              <HiOutlineCloud className="w-4 h-4" /> Connect Google Drive
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Connected</span>
              </div>
              <button
                onClick={handleDisconnectDrive}
                className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 underline"
              >
                Disconnect
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Last backup: {formatBackupDate(lastBackupAt)}
              </span>
              <button
                onClick={handleBackupNow}
                disabled={backingUp}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50"
              >
                <HiOutlineCloudUpload className={`w-3.5 h-3.5 ${backingUp ? 'animate-pulse' : ''}`} />
                {backingUp ? 'Backing up...' : 'Back up now'}
              </button>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Available backups
              </div>
              {backupsLoading ? (
                <div className="text-sm text-gray-400">Loading...</div>
              ) : backups.length === 0 ? (
                <div className="text-sm text-gray-400">No backups yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {backups.map((file) => (
                    <div
                      key={file.fileId}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-200 truncate pr-2">
                        {new Date(file.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleRestoreClick(file)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Automated backups only run when the app is opened, and only if 7+ days have
              passed since the last one — this is not a true background process.
            </p>
          </div>
        )}
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

      {/* About */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineInformationCircle className="w-4 h-4" /> About
        </h2>
        <Link
          to="/settings/about"
          className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Help &amp; Support</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              How-to guide and bug reporting
            </div>
          </div>
          <HiChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
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

      <ConfirmDialog
        isOpen={restoreTarget !== null}
        title="Restore from backup?"
        message={
          restoreTarget
            ? `This will permanently delete your current data and replace it with the backup from ${new Date(restoreTarget.file.createdAt).toLocaleString()}: ${restoreTarget.preview.counts.accounts} accounts, ${restoreTarget.preview.counts.transactions} transactions, ${restoreTarget.preview.counts.categories} categories, ${restoreTarget.preview.counts.budgets} budgets, ${restoreTarget.preview.counts.tags} tags.` +
              (restoreTarget.preview.schemaMismatch
                ? ' Warning: this backup was made with a different app version (schema mismatch) — restoring it is not guaranteed to work correctly, automatic migration is not supported.'
                : '') +
              ' This cannot be undone.'
            : ''
        }
        confirmLabel={restoring ? 'Restoring...' : 'Restore'}
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreTarget(null)}
        danger
      />
    </div>
  );
};

export default SettingsPage;
