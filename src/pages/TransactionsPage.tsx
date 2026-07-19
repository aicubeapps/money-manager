import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiUpload } from 'react-icons/hi';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import TransactionList from '../components/transactions/TransactionList';
import TransactionForm from '../components/transactions/TransactionForm';
import { createTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { createRecurringRule } from '../services/firestore/recurringRules';
import { calculateNextDueDate } from '../utils/recurringDates';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/common/Toast';
import Skeleton from '../components/common/Skeleton';
import PullToRefresh from '../components/common/PullToRefresh';
import type { Transaction } from '../types';

const TransactionsListSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton width={140} height={28} className="mb-2" />
        <Skeleton width={100} height={16} />
      </div>
      <Skeleton width={140} height={36} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Skeleton height={64} />
      <Skeleton height={64} />
    </div>
    <Skeleton height={48} />
    <div className="space-y-4">
      {[0, 1, 2].map((group) => (
        <div key={group} className="space-y-2">
          <Skeleton width={120} height={14} />
          {[0, 1].map((row) => (
            <div key={row} className="card p-4 flex items-center gap-4">
              <Skeleton width={40} height={40} shape="circle" />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} />
              </div>
              <Skeleton width={64} height={16} />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const TransactionsPage = () => {
  const { currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { transactions, loading, error } = useTransactions(undefined, refreshKey);
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
    // Give the resubscribed listener a moment to settle so the pull
    // indicator doesn't just flash instantly.
    await new Promise((resolve) => setTimeout(resolve, 400));
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const handleAdd = () => { setEditingTransaction(null); setShowForm(true); };
  const handleEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setShowForm(true); };

  const handleSave = async (data: any) => {
    if (!currentUser) return;
    const { recurringRule, ...transactionData } = data;
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionData);
      } else {
        await createTransaction(currentUser.uid, transactionData);
      }

      let message = editingTransaction ? 'Transaction updated' : 'Transaction added';

      if (recurringRule) {
        const nextDueDate = calculateNextDueDate(
          recurringRule.startDate,
          recurringRule.frequency,
          recurringRule.dayOfMonth,
          recurringRule.dayOfWeek,
          recurringRule.weekOfMonth
        );
        await createRecurringRule(currentUser.uid, {
          templateTransaction: {
            type: transactionData.type,
            amount: transactionData.amount,
            accountId: transactionData.accountId,
            categoryId: transactionData.categoryId || '',
            description: transactionData.notes || '',
            // Transfers have no category but do need both accounts captured —
            // TransactionForm sets accountId to fromAccountId for transfers,
            // but the destination account only lives in toAccountId, which
            // was previously dropped here entirely.
            ...(transactionData.type === 'transfer'
              ? { fromAccountId: transactionData.fromAccountId, toAccountId: transactionData.toAccountId }
              : {}),
            ...(transactionData.tags && transactionData.tags.length > 0
              ? { tags: transactionData.tags }
              : {}),
          },
          frequency: recurringRule.frequency,
          dayOfMonth: recurringRule.dayOfMonth,
          weekOfMonth: recurringRule.weekOfMonth,
          dayOfWeek: recurringRule.dayOfWeek,
          startDate: recurringRule.startDate,
          nextDueDate,
        });
        message += ' and recurring rule created';
      }

      toast.success(message);
      setShowForm(false);
      setEditingTransaction(null);
    } catch (err) {
      console.error('Error saving transaction:', err);
      toast.error('Failed to save transaction');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast.success('Transaction deleted');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Failed to delete transaction');
    }
  };

  if (loading) return <TransactionsListSkeleton />;
  if (error) return <div className="card p-6 text-red-500 text-center">Error: {error}</div>;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex justify-end mb-3">
        <Link to="/transactions/import" className="btn-secondary text-sm">
          <HiUpload className="w-4 h-4" /> Import CSV
        </Link>
      </div>
      <TransactionList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {showForm && (
        <TransactionForm
          accounts={accounts}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          transaction={editingTransaction}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingTransaction(null); }}
        />
      )}
    </PullToRefresh>
  );
};

export default TransactionsPage;
