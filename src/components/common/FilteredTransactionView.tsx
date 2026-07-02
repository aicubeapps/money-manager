import { useMemo, useRef } from 'react';
import { HiX } from 'react-icons/hi';
import { useTransactions } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTags } from '../../hooks/useTags';
import { isExcludedFromBudget } from '../../utils/budgetSpend';
import TransactionList from '../transactions/TransactionList';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import type { Tag, Transaction } from '../../types';

export type TransactionFilterDescriptor =
  | { kind: 'account'; accountId: string; limit?: number }
  | { kind: 'accountGroup'; accountIds: string[] }
  | { kind: 'category'; categoryId: string; startDate?: Date; endDate?: Date }
  // Mirrors budgetSpend.ts's getCategorySpend criteria exactly (expense type,
  // categoryId, month/year match, excludeFromBudget tags skipped) so the list
  // shown here always matches what's actually counted against the budget.
  | { kind: 'budgetCategory'; categoryId: string; month: number; year: number };

interface FilteredTransactionViewProps {
  isOpen: boolean;
  title: string;
  filter: TransactionFilterDescriptor;
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

const FilteredTransactionView = ({ isOpen, title, filter, onClose }: FilteredTransactionViewProps) => {
  const { transactions, loading } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { tags } = useTags();
  const touchStartY = useRef<number | null>(null);

  const filtered = useMemo(() => {
    if (!isOpen) return [];
    const result = transactions
      .filter((t) => matchesFilter(t, filter, tags))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filter.kind === 'account' && filter.limit) {
      return result.slice(0, filter.limit);
    }
    return result;
  }, [isOpen, transactions, filter, tags]);

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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-3">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
              <HiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
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
