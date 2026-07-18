import { useEffect, useState } from 'react';
import { HiX, HiOutlineSearch } from 'react-icons/hi';
import { useTransactions } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTags } from '../../hooks/useTags';
import { updateTransaction } from '../../services/transactionService';
import TransactionList from '../transactions/TransactionList';
import TransactionForm from '../transactions/TransactionForm';
import EmptyState from './EmptyState';
import { toast } from './Toast';
import type { Transaction } from '../../types';

const DEBOUNCE_MS = 300;

interface GlobalSearchOverlayProps {
  onClose: () => void;
}

/**
 * Full-history search, unlike TransactionList's own search box which only
 * filters whatever subset of transactions the current page already loaded.
 * Pulls the live, unfiltered useTransactions() feed directly so results
 * cover everything the user has ever recorded.
 */
const GlobalSearchOverlay = ({ onClose }: GlobalSearchOverlayProps) => {
  const { transactions, loading } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { tags } = useTags();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const getAccountName = (id?: string) => (id ? accounts.find((a) => a.id === id)?.name : undefined);
  const getCategoryName = (id?: string) => (id ? categories.find((c) => c.id === id)?.name : undefined);
  const getTagNames = (ids?: string[]) =>
    (ids || []).map((id) => tags.find((t) => t.id === id)?.name).filter((n): n is string => !!n);

  const q = debouncedQuery.trim().toLowerCase();
  const results = q
    ? transactions.filter((t) => {
        const haystack = [
          t.notes,
          getCategoryName(t.categoryId),
          getAccountName(t.accountId),
          getAccountName(t.fromAccountId),
          getAccountName(t.toAccountId),
          ...getTagNames(t.tags),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : [];

  const handleSaveEdit = async (data: any) => {
    if (!editingTransaction) return;
    try {
      await updateTransaction(editingTransaction.id, data);
      toast.success('Transaction updated');
      setEditingTransaction(null);
    } catch (err) {
      console.error('Error updating transaction:', err);
      toast.error('Failed to update transaction');
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl sm:mt-16 h-full sm:h-auto sm:max-h-[80vh] bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <HiOutlineSearch className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, category, account, tags..."
            className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 dark:text-white placeholder-gray-400"
          />
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close search"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!q ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">
              Start typing to search across all your transactions.
            </p>
          ) : loading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">Loading...</p>
          ) : results.length === 0 ? (
            <EmptyState icon="🔍" title="No matches" description={`Nothing found for "${debouncedQuery}".`} />
          ) : (
            <TransactionList
              transactions={results}
              accounts={accounts}
              categories={categories}
              compact
              onEdit={setEditingTransaction}
            />
          )}
        </div>
      </div>

      {editingTransaction && (
        <div onClick={(e) => e.stopPropagation()}>
          <TransactionForm
            accounts={accounts}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            transaction={editingTransaction}
            onSave={handleSaveEdit}
            onCancel={() => setEditingTransaction(null)}
          />
        </div>
      )}
    </div>
  );
};

export default GlobalSearchOverlay;
