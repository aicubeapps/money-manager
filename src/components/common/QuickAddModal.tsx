import { useState, useEffect } from 'react';
import { createTransaction } from '../../services/transactionService';
import { getTags, getTopUsedTags } from '../../services/tagService';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import { useAuth } from '../../hooks/useAuth';
import { toast } from './Toast';
import type { Tag } from '../../types';

type QuickAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const QuickAddModal = ({
  isOpen,
  onClose,
}: QuickAddModalProps) => {
  const { currentUser } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { transactions } = useTransactions();

  const activeAccounts = accounts.filter(
    (a) => a.active
  );

  const expenseCategories = categories.filter(
    (c) => c.active && c.type === 'expense'
  );

  const [amount, setAmount] = useState('');

  const [accountId, setAccountId] = useState(
    localStorage.getItem('lastExpenseAccount') || ''
  );

  const [categoryId, setCategoryId] = useState(
    localStorage.getItem('lastExpenseCategory') || ''
  );

  const [saving, setSaving] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState('');

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    getTags(currentUser.uid).then(setTags).catch(() => {});
  }, [isOpen, currentUser]);

  const topTags = getTopUsedTags(tags, transactions, 5);

  if (!isOpen) return null;

  const handleTagSelect = (tagId: string) => {
    const nextTagId = selectedTagId === tagId ? '' : tagId;
    setSelectedTagId(nextTagId);
    if (!nextTagId) return;
    const tag = tags.find((t) => t.id === nextTagId);
    if (tag?.defaultAccountId) setAccountId(tag.defaultAccountId);
    if (tag?.defaultCategoryId) setCategoryId(tag.defaultCategoryId);
  };

  const handleSave = async () => {
    if (!currentUser) return;

    if (!amount || Number(amount) <= 0) {
      toast.error('Enter amount');
      return;
    }

    if (!accountId) {
      toast.error('Select account');
      return;
    }

    if (!categoryId) {
      toast.error('Select category');
      return;
    }

    try {
      setSaving(true);

      await createTransaction(currentUser.uid, {
        type: 'expense',
        date: new Date(),
        amount: Number(amount),
        accountId,
        categoryId,
        ...(selectedTagId ? { tags: [selectedTagId] } : {}),
      });

      localStorage.setItem(
        'lastExpenseAccount',
        accountId
      );

      localStorage.setItem(
        'lastExpenseCategory',
        categoryId
      );

      toast.success('Expense added');

      setAmount('');
      setSelectedTagId('');

      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add expense');
    } finally {
      setSaving(false);
    }
  };

  return (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    onClick={onClose}
  >
    <div
      className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="mb-5 text-xl font-semibold text-gray-900 dark:text-white">
        Quick Add Expense
      </h2>

      <div className="space-y-4">

        {topTags.length > 0 && (
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagSelect(tag.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedTagId === tag.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount
          </label>

          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="
                 w-full
                rounded-xl
                border
                border-gray-300
                dark:border-gray-700
                bg-white
                dark:bg-gray-800
                text-gray-900
                dark:text-gray-100
                px-3
                py-2.5
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            placeholder="0.00"
            autoFocus
            />
           </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Account
          </label>

          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="
              w-full
              rounded-xl
              border
              border-gray-300
              dark:border-gray-700
              bg-white
              dark:bg-gray-800
              text-gray-900
              dark:text-gray-100
              px-3
              py-2.5
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          >
            <option value="">
              🏦 Select Account
            </option>

            {activeAccounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="
              w-full
              rounded-xl
              border
              border-gray-300
              dark:border-gray-700
              bg-white
              dark:bg-gray-800
              text-gray-900
              dark:text-gray-100
              px-3
              py-2.5
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          >
            <option value="">
              📂 Select Category
            </option>

            {expenseCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.icon || '📌'} {category.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      <div className="mt-6 flex justify-end gap-3">

        <button
          onClick={onClose}
          className="
            rounded-xl
            bg-red-500
            hover:bg-red-600
            text-white
            px-5
            py-2.5
            transition-colors
          "
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="
            rounded-xl
            bg-green-600
            hover:bg-green-700
            text-white
            px-5
            py-2.5
            transition-colors
            disabled:opacity-50
          "
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

      </div>
    </div>
  </div>
);
};

export default QuickAddModal;
