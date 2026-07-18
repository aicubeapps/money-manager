import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useRecurringReminders } from '../../hooks/useRecurringReminders';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { createTransaction } from '../../services/transactionService';
import { updateRecurringRule } from '../../services/firestore/recurringRules';
import { calculateNextDueDate } from '../../utils/recurringDates';
import { toast } from '../common/Toast';
import ConfirmDialog from '../common/ConfirmDialog';
import GlobalSearchOverlay from '../common/GlobalSearchOverlay';
import type { RecurringRule } from '../../types';
import { HiOutlineMenu, HiOutlineMoon, HiOutlineSun, HiOutlineLogout, HiOutlineSearch } from 'react-icons/hi';
import { FiBell } from 'react-icons/fi';

interface HeaderProps {
  toggleSidebar: () => void;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type PendingRuleAction = { kind: 'confirm' | 'skip'; rule: RecurringRule };

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { currentUser, userData, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const formatCurrency = useFormatCurrency();
  const { dueRules } = useRecurringReminders();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [showReminders, setShowReminders] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingRuleAction | null>(null);

  const getAccountName = (id?: string) => accounts.find((a) => a.id === id)?.name || 'Unknown account';
  const getCategoryName = (id?: string) => categories.find((c) => c.id === id)?.name;

  const runConfirm = async (rule: RecurringRule) => {
    if (!currentUser) return;
    setActioningId(rule.id);
    try {
      const { type, amount, accountId, categoryId, description, tags, fromAccountId, toAccountId } =
        rule.templateTransaction;
      await createTransaction(currentUser.uid, {
        type,
        date: new Date(),
        amount,
        notes: description,
        tags,
        // Mirrors TransactionForm's own onSubmit branch: transfers carry
        // fromAccountId/toAccountId (accountId mirrors fromAccountId) and no
        // category; expense/income carry accountId + categoryId only.
        ...(type === 'transfer'
          ? { accountId: fromAccountId!, fromAccountId, toAccountId }
          : { accountId, ...(categoryId ? { categoryId } : {}) }),
      });
      await updateRecurringRule(rule.id, {
        nextDueDate: calculateNextDueDate(rule.nextDueDate, rule.frequency, rule.dayOfMonth),
        lastCreatedDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Transaction added from recurring rule');
    } catch (err) {
      console.error('Error confirming recurring transaction:', err);
      toast.error('Failed to add transaction');
    } finally {
      setActioningId(null);
    }
  };

  const runSkip = async (rule: RecurringRule) => {
    setActioningId(rule.id);
    try {
      await updateRecurringRule(rule.id, {
        nextDueDate: calculateNextDueDate(rule.nextDueDate, rule.frequency, rule.dayOfMonth),
      });
      toast.info('Recurring transaction skipped');
    } catch (err) {
      console.error('Error skipping recurring transaction:', err);
      toast.error('Failed to skip recurring transaction');
    } finally {
      setActioningId(null);
    }
  };

  const handlePendingConfirm = () => {
    if (!pendingAction) return;
    if (pendingAction.kind === 'confirm') runConfirm(pendingAction.rule);
    else runSkip(pendingAction.rule);
  };

  const pendingDialogCopy = (() => {
    if (!pendingAction) return { title: '', message: '' };
    const { rule } = pendingAction;
    const desc = rule.templateTransaction.description || 'Recurring transaction';
    if (pendingAction.kind === 'confirm') {
      const amountText = formatCurrency(rule.templateTransaction.amount);
      const detail =
        rule.templateTransaction.type === 'transfer'
          ? `from ${getAccountName(rule.templateTransaction.fromAccountId)} to ${getAccountName(rule.templateTransaction.toAccountId)}`
          : `to ${getAccountName(rule.templateTransaction.accountId)}` +
            (getCategoryName(rule.templateTransaction.categoryId)
              ? ` (${getCategoryName(rule.templateTransaction.categoryId)})`
              : '');
      return {
        title: 'Add this transaction?',
        message: `This will add a ${amountText} ${rule.templateTransaction.type} ${detail} for "${desc}".`,
      };
    }
    return {
      title: 'Skip this occurrence?',
      message: `"${desc}" will move to its next due date without adding a transaction.`,
    };
  })();

  return (
    <>
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

      <div className="flex items-center gap-1 relative">
        <div>
          <button
            onClick={() => setShowReminders((prev) => !prev)}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Recurring transaction reminders"
          >
            <FiBell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {dueRules.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {dueRules.length}
              </span>
            )}
          </button>

          {showReminders && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowReminders(false)}
              />
              {/* Anchored to the whole icon-cluster wrapper (which sits flush
                  against the header's right edge via justify-between), not
                  the bell button's own small wrapper — anchoring to the
                  bell directly overflowed past the left viewport edge on
                  narrow screens, since the bell isn't the rightmost icon.
                  max-w caps it on very narrow viewports too. */}
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                    Recurring transactions due
                  </h3>
                </div>

                {dueRules.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No recurring transactions due
                  </p>
                ) : (
                  dueRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {rule.templateTransaction.description || 'Recurring transaction'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatCurrency(rule.templateTransaction.amount)} · {capitalize(rule.frequency)}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setPendingAction({ kind: 'skip', rule })}
                          disabled={actioningId === rule.id}
                          className="btn-secondary flex-1 justify-center text-xs py-1.5 disabled:opacity-50"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => setPendingAction({ kind: 'confirm', rule })}
                          disabled={actioningId === rule.id}
                          className="btn-primary flex-1 justify-center text-xs py-1.5 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowSearch(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Search transactions"
        >
          <HiOutlineSearch className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

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

    <ConfirmDialog
      isOpen={pendingAction !== null}
      title={pendingDialogCopy.title}
      message={pendingDialogCopy.message}
      confirmLabel={pendingAction?.kind === 'confirm' ? 'Add transaction' : 'Skip'}
      onConfirm={handlePendingConfirm}
      onCancel={() => setPendingAction(null)}
      danger={pendingAction?.kind === 'skip'}
    />

    {showSearch && <GlobalSearchOverlay onClose={() => setShowSearch(false)} />}
    </>
  );
};

export default Header;
