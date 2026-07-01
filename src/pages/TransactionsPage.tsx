import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiUpload } from 'react-icons/hi';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import TransactionList from '../components/transactions/TransactionList';
import TransactionForm from '../components/transactions/TransactionForm';
import { createTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Transaction } from '../types';

const TransactionsPage = () => {
  const { currentUser } = useAuth();
  const { transactions, loading, error } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const handleAdd = () => { setEditingTransaction(null); setShowForm(true); };
  const handleEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setShowForm(true); };

  const handleSave = async (data: any) => {
    if (!currentUser) return;
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
        toast.success('Transaction updated');
      } else {
        await createTransaction(currentUser.uid, data);
        toast.success('Transaction added');
      }
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

  if (loading) return <LoadingSpinner message="Loading transactions..." />;
  if (error) return <div className="card p-6 text-red-500 text-center">Error: {error}</div>;

  return (
    <>
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
    </>
  );
};

export default TransactionsPage;
