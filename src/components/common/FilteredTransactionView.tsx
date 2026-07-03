import { useMemo, useRef, useState } from 'react';
import { HiX, HiChevronLeft } from 'react-icons/hi';
import { useTransactions } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTags } from '../../hooks/useTags';
import { isExcludedFromBudget } from '../../utils/budgetSpend';
import { getAccountIcon, getAccountColor } from '../../utils/accountHelpers';
import { calculateAccountBalance } from '../../utils/accountBalance';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import TransactionList from '../transactions/TransactionList';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import type { Account, Tag, Transaction } from '../../types';

export type TransactionFilterDescriptor =
  | { kind: 'account'; accountId: string; limit?: number }
  | { kind: 'accountGroup'; accountIds: string[] }
  | { kind: 'category'; categoryId: string; startDate?: Date; endDate?: Date }
  // Mirrors budgetSpend.ts's getCategorySpend criteria exactly (expense type,
  // categoryId, month/year match, excludeFromBudget tags skipped) so the list
  // shown here always matches what's actually counted against the budget.
  | { kind: 'budgetCategory'; categoryId: string; month: number; year: number };

// Number of transactions shown when drilling from an account row into its
// transactions, in EITHER mode. The 'accounts'-mode flow's account rows call
// into the exact same 'account' filter descriptor/limit used by AccountList's
// own card-tap drill-down (10), rather than the "recent 5" mentioned in the
// ask — see FilteredTransactionView's file-level note in the PR summary for
// why: the task explicitly says to reuse that code path, not fork it.
const ACCOUNT_DRILLDOWN_LIMIT = 10;

interface FilteredTransactionViewProps {
  isOpen: boolean;
  title: string;
  filter: TransactionFilterDescriptor;
  /** 'accounts' renders the list of accounts in filter.accountIds (filter
   * must be kind: 'accountGroup') instead of a transaction list; tapping an
   * account drills into that account's transactions within this same modal.
   * Defaults to 'transactions'. */
  mode?: 'transactions' | 'accounts';
  onClose: () => void;
}

const matchesFilter = (t: Transaction, filter: TransactionFilterDescriptor, tags: Tag[]): boolean => {
  switch (filter.kind) {
    case 'account':
      return t.accountId === filter.accountId || t.fromAccountId === filter.accountId || t.toAccountId === filter.accountId;
    case 'accountGroup':
      return (
        filter.accountIds.includes(t.accountId) ||
        (!!t.fromAccountId && filter.accountIds.includes(t.fromAccountId)) ||
        (!!t.toAccountId && filter.accountIds.includes(t.toAccountId))
      );
    case 'category': {
      if (t.categoryId !== filter.categoryId) return false;
      const d = new Date(t.date);
      if (filter.startDate && d < filter.startDate) return false;
      if (filter.endDate && d > filter.endDate) return false;
      return true;
    }
    case 'budgetCategory': {
      if (t.type !== 'expense' || t.categoryId !== filter.categoryId) return false;
      const d = new Date(t.date);
      if (d.getMonth() + 1 !== filter.month || d.getFullYear() !== filter.year) return false;
      return !isExcludedFromBudget(t, tags);
    }
  }
};

// Simple swipe-down-to-close: fires when a touch move on the header drag
// handle travels down more than a small threshold. Not a full gesture
// library — intentionally minimal per the "don't over-engineer" ask.
const SWIPE_CLOSE_THRESHOLD_PX = 80;

const FilteredTransactionView = ({ isOpen, title, filter, mode = 'transactions', onClose }: FilteredTransactionViewProps) => {
  const formatCurrency = useFormatCurrency();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories } = useCategories();
  const { tags } = useTags();
  const touchStartY = useRef<number | null>(null);

  // Drilling from an account row (in 'accounts' mode) reuses this same modal
  // instance in 'transactions' mode, scoped to that one account — exactly
  // the { kind: 'account', accountId, limit } descriptor AccountList's own
  // card-tap drill-down builds, run through the same matchesFilter/
  // TransactionList render path below (not a separate implementation).
  const [drilledAccount, setDrilledAccount] = useState<Account | null>(null);

  // Reset the inner drill-down whenever the outer modal is reopened with a
  // new filter/mode (e.g. tapping a different summary card). Adjusting state
  // during render (React's documented pattern for this) instead of an effect,
  // so it takes effect in the same render rather than causing an extra one.
  const resetKey = `${isOpen}|${mode}|${JSON.stringify(filter)}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    if (drilledAccount) setDrilledAccount(null);
  }

  const showingAccountsList = mode === 'accounts' && !drilledAccount;

  const effectiveFilter: TransactionFilterDescriptor = useMemo(
    () =>
      drilledAccount
        ? { kind: 'account', accountId: drilledAccount.id, limit: ACCOUNT_DRILLDOWN_LIMIT }
        : filter,
    [drilledAccount, filter]
  );

  const filtered = useMemo(() => {
    if (!isOpen || showingAccountsList) return [];
    const result = transactions
      .filter((t) => matchesFilter(t, effectiveFilter, tags))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (effectiveFilter.kind === 'account' && effectiveFilter.limit) {
      return result.slice(0, effectiveFilter.limit);
    }
    return result;
  }, [isOpen, showingAccountsList, transactions, effectiveFilter, tags]);

  const groupAccounts = useMemo(() => {
    if (!showingAccountsList || filter.kind !== 'accountGroup') return [];
    return accounts.filter((a) => filter.accountIds.includes(a.id));
  }, [showingAccountsList, filter, accounts]);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (delta > SWIPE_CLOSE_THRESHOLD_PX) onClose();
  };

  const headerTitle = drilledAccount ? `${drilledAccount.name} · Recent Transactions` : title;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl h-[85vh] sm:h-auto sm:max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="sm:hidden w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-2" />
          <div className="flex justify-between items-center p-5 pb-4">
            <div className="flex items-center gap-1 min-w-0">
              {drilledAccount && (
                <button
                  onClick={() => setDrilledAccount(null)}
                  className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Back to accounts"
                >
                  <HiChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              )}
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-3">{headerTitle}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
              <HiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {showingAccountsList ? (
            accountsLoading ? (
              <LoadingSpinner message="Loading accounts..." />
            ) : groupAccounts.length === 0 ? (
              <EmptyState icon="🏦" title="No accounts" description="No accounts in this group." />
            ) : (
              <div className="space-y-2">
                {groupAccounts.map((account) => {
                  const Icon = getAccountIcon(account.type);
                  const color = getAccountColor(account.type);
                  const balance = calculateAccountBalance(account, transactions);
                  return (
                    <div
                      key={account.id}
                      onClick={() => setDrilledAccount(account)}
                      role="button"
                      tabIndex={0}
                      className={`card p-4 border-l-4 ${color.border} flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-all duration-150`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                          <Icon className={`w-5 h-5 ${color.text}`} />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{account.name}</h3>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">
                        {formatCurrency(balance)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : transactionsLoading ? (
            <LoadingSpinner message="Loading transactions..." />
          ) : filtered.length === 0 ? (
            <EmptyState icon="💸" title="No transactions" description="No transactions match this filter." />
          ) : (
            <TransactionList transactions={filtered} accounts={accounts} categories={categories} compact />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilteredTransactionView;
