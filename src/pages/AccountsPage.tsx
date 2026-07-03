import { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import AccountList from '../components/accounts/AccountList';
import AccountForm from '../components/accounts/AccountForm';
import {
  createAccount,
  updateAccount,
  archiveAccount,
  reactivateAccount,
  deleteAccount,
} from '../services/accountService';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/common/Toast';
import Skeleton from '../components/common/Skeleton';
import type { Account, AccountGroup, AccountType } from '../types';

type AccountFormPayload = {
  name: string;
  type: AccountType;
  accountGroup: AccountGroup;
  openingBalance: number;
  openingDate: string;
  creditLimit?: number;
  statementDate?: number;
  dueDate?: number;
};

const AccountListSkeleton = () => (
  <div className="space-y-5 animate-fade-in">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton width={140} height={28} className="mb-2" />
        <Skeleton width={120} height={16} />
      </div>
      <Skeleton width={150} height={36} />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Skeleton height={210} />
      <Skeleton height={210} />
    </div>
    <Skeleton width={220} height={48} />
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={130} />)}
    </div>
  </div>
);

const AccountsPage = () => {
  const { currentUser } = useAuth();
  const { accounts, loading, error } = useAccounts();
  const { transactions } = useTransactions();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleAdd = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleSave = async (data: AccountFormPayload) => {
    if (!currentUser) return;

    try {
      const payload = {
        ...data,
        openingDate: new Date(data.openingDate),
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
        toast.success('Account updated');
      } else {
        await createAccount(currentUser.uid, payload);
        toast.success('Account created');
      }

      setShowForm(false);
      setEditingAccount(null);
    } catch (err) {
      console.error('Error saving account:', err);
      toast.error('Failed to save account');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveAccount(id);
      toast.info('Account archived');
    } catch (err) {
      console.error('Error archiving account:', err);
      toast.error('Failed to archive account');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateAccount(id);
      toast.success('Account reactivated');
    } catch (err) {
      console.error('Error reactivating account:', err);
      toast.error('Failed to reactivate account');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
      toast.success('Account deleted');
    } catch (err) {
      console.error('Error deleting account:', err);
      toast.error('Failed to delete account');
    }
  };

  if (loading) {
    return <AccountListSkeleton />;
  }

  if (error) {
    return (
      <div className="card p-6 text-red-500 text-center">
        Error loading accounts: {error}
      </div>
    );
  }

  return (
    <>
      <AccountList
        accounts={accounts}
        transactions={transactions}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onReactivate={handleReactivate}
        onDelete={handleDelete}
      />

      {showForm && (
        <AccountForm
          account={editingAccount}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingAccount(null);
          }}
        />
      )}
    </>
  );
};

export default AccountsPage;