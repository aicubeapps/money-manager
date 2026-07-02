import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HiX } from 'react-icons/hi';
import type { Transaction, Account, Category, Tag } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getTags, createTag } from '../../services/tagService';

const transactionSchema = z
  .object({
    type: z.enum(['expense', 'income', 'transfer']),
    date: z.string().min(1, 'Date is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    accountId: z.string().optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    categoryId: z.string().optional(),
    notes: z.string().optional(),
    tagId: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    recurringDayOfMonth: z.number().optional(),
    recurringStartDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type !== 'transfer') return data.accountId && data.accountId.length > 0;
      return true;
    },
    { message: 'Account is required', path: ['accountId'] }
  )
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return data.fromAccountId && data.toAccountId && data.fromAccountId !== data.toAccountId;
      }
      return true;
    },
    { message: 'Transfer requires two different accounts', path: ['fromAccountId'] }
  )
  .refine(
    (data) => {
      if (!data.isRecurring) return true;
      return !!data.recurringFrequency && !!data.recurringStartDate;
    },
    { message: 'Frequency and start date are required for recurring transactions', path: ['recurringFrequency'] }
  )
  .refine(
    (data) => {
      if (!data.isRecurring) return true;
      if (data.recurringFrequency === 'monthly' || data.recurringFrequency === 'yearly') {
        return (
          typeof data.recurringDayOfMonth === 'number' &&
          data.recurringDayOfMonth >= 1 &&
          data.recurringDayOfMonth <= 31
        );
      }
      return true;
    },
    { message: 'Day of month must be between 1 and 31', path: ['recurringDayOfMonth'] }
  );

type FormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  accounts: Account[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  transaction?: Transaction | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS = [
  { value: 'expense', label: '💸 Expense', color: 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
  { value: 'income', label: '💰 Income', color: 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
  { value: 'transfer', label: '↔️ Transfer', color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
];

const TransactionForm = ({ accounts, expenseCategories, incomeCategories, transaction, onSave, onCancel }: TransactionFormProps) => {
  const { currentUser } = useAuth();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          date: new Date(transaction.date).toISOString().split('T')[0],
          amount: transaction.amount,
          accountId: transaction.accountId,
          fromAccountId: transaction.fromAccountId || '',
          toAccountId: transaction.toAccountId || '',
          categoryId: transaction.categoryId || '',
          notes: transaction.notes || '',
          tagId: transaction.tags?.[0] || '',
          isRecurring: false,
        }
      : {
          type: 'expense',
          date: new Date().toISOString().split('T')[0],
          amount: undefined,
          tagId: '',
          isRecurring: false,
        },
  });

  const transactionType = watch('type');
  const isRecurring = watch('isRecurring');
  const recurringFrequency = watch('recurringFrequency');
  const dateValue = watch('date');
  const recurringStartDate = watch('recurringStartDate');
  const recurringDayOfMonth = watch('recurringDayOfMonth');

  // Default the recurrence start date to the transaction's own date the first
  // time the toggle is turned on, without overwriting a value the user already set.
  useEffect(() => {
    if (isRecurring && !recurringStartDate) {
      setValue('recurringStartDate', dateValue);
    }
  }, [isRecurring, dateValue, recurringStartDate, setValue]);

  // Default "day of month" to the day-of-month of the recurrence start date,
  // only once monthly/yearly is selected and only if not already set.
  useEffect(() => {
    if (
      isRecurring &&
      (recurringFrequency === 'monthly' || recurringFrequency === 'yearly') &&
      !recurringDayOfMonth
    ) {
      const anchor = recurringStartDate || dateValue;
      if (anchor) setValue('recurringDayOfMonth', new Date(anchor).getDate());
    }
  }, [isRecurring, recurringFrequency, recurringStartDate, dateValue, recurringDayOfMonth, setValue]);

  // Fetch tags once when the form opens
  useEffect(() => {
    if (!currentUser) return;
    getTags(currentUser.uid).then(setAllTags).catch(() => {});
  }, [currentUser]);

  const handleTagChange = (tagId: string) => {
    setValue('tagId', tagId);
    const tag = allTags.find((t) => t.id === tagId);
    if (tag?.defaultAccountId) {
      if (transactionType === 'transfer') setValue('fromAccountId', tag.defaultAccountId);
      else setValue('accountId', tag.defaultAccountId);
    }
    if (tag?.defaultCategoryId) setValue('categoryId', tag.defaultCategoryId);
  };

  const handleCreateTagInline = async () => {
    if (!currentUser || !newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const tag = await createTag(currentUser.uid, { name: newTagName.trim() });
      setAllTags((prev) => [...prev, tag]);
      setValue('tagId', tag.id);
      setNewTagName('');
    } finally {
      setCreatingTag(false);
    }
  };

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        date: new Date(transaction.date).toISOString().split('T')[0],
        amount: transaction.amount,
        accountId: transaction.accountId,
        fromAccountId: transaction.fromAccountId || '',
        toAccountId: transaction.toAccountId || '',
        categoryId: transaction.categoryId || '',
        notes: transaction.notes || '',
        tagId: transaction.tags?.[0] || '',
        isRecurring: false,
      });
    }
  }, [transaction, reset]);

  const onSubmit = (data: FormData) => {
    const payload: any = {
      type: data.type,
      date: new Date(data.date),
      amount: data.amount,
    };
    if (data.type !== 'transfer') {
      payload.accountId = data.accountId;
      if (data.categoryId) payload.categoryId = data.categoryId;
    } else {
      payload.accountId = data.fromAccountId;
      payload.fromAccountId = data.fromAccountId;
      payload.toAccountId = data.toAccountId;
    }
    if (data.notes) payload.notes = data.notes;
    if (data.tagId) payload.tags = [data.tagId];
    if (data.isRecurring && data.recurringFrequency && data.recurringStartDate) {
      payload.recurringRule = {
        frequency: data.recurringFrequency,
        dayOfMonth:
          data.recurringFrequency === 'monthly' || data.recurringFrequency === 'yearly'
            ? data.recurringDayOfMonth
            : undefined,
        startDate: data.recurringStartDate,
      };
    }
    onSave(payload);
  };

  const getCategories = () => {
    if (transactionType === 'expense') return expenseCategories.filter(c => c.active);
    if (transactionType === 'income') return incomeCategories.filter(c => c.active);
    return [];
  };

  const activeAccounts = accounts.filter((a) => a.active);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Type picker */}
          <div>
            <label className="form-label">Transaction type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(({ value, label, color }) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" {...register('type')} value={value} className="sr-only" />
                  <div className={`border-2 rounded-xl p-3 text-center text-sm font-medium transition-all duration-150 ${
                    transactionType === value ? color + ' border-opacity-100' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}>
                    {label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="form-label">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="form-input pl-7 text-lg font-semibold"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="form-label">Date</label>
            <input {...register('date')} type="date" className="form-input" />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>

          {/* Account fields */}
          {transactionType !== 'transfer' ? (
            <div>
              <label className="form-label">Account</label>
              <select {...register('accountId')} className="form-input">
                <option value="">Select account</option>
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
              {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">From</label>
                <select {...register('fromAccountId')} className="form-input text-sm">
                  <option value="">Select account</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                {errors.fromAccountId && <p className="text-red-500 text-xs mt-1">{errors.fromAccountId.message}</p>}
              </div>
              <div>
                <label className="form-label">To</label>
                <select {...register('toAccountId')} className="form-input text-sm">
                  <option value="">Select account</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                {errors.toAccountId && <p className="text-red-500 text-xs mt-1">{errors.toAccountId.message}</p>}
              </div>
            </div>
          )}

          {/* Category */}
          {transactionType !== 'transfer' && (
            <div>
              <label className="form-label">Category</label>
              <select {...register('categoryId')} className="form-input">
                <option value="">— Uncategorized —</option>
                {getCategories().map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon || '📌'} {cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="form-label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input {...register('notes')} className="form-input" placeholder="Add a note..." />
          </div>

          {/* Tag */}
          <div>
            <label className="form-label">Tag <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="hidden" {...register('tagId')} />
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagChange(watch('tagId') === tag.id ? '' : tag.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    watch('tagId') === tag.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {allTags.length === 0 && (
                <p className="text-xs text-gray-400">No tags yet — create one below.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="form-input flex-1"
                placeholder="New tag name"
              />
              <button
                type="button"
                onClick={handleCreateTagInline}
                disabled={creatingTag || !newTagName.trim()}
                className="btn-secondary text-sm px-3 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('isRecurring')}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-500 focus:ring-primary-400"
              />
              <span className="form-label mb-0">Make this recurring</span>
            </label>

            {isRecurring && (
              <div className="mt-3 space-y-3 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                <div>
                  <label className="form-label">Frequency</label>
                  <select {...register('recurringFrequency')} className="form-input">
                    <option value="">Select frequency</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {errors.recurringFrequency && (
                    <p className="text-red-500 text-xs mt-1">{errors.recurringFrequency.message}</p>
                  )}
                </div>

                {(recurringFrequency === 'monthly' || recurringFrequency === 'yearly') && (
                  <div>
                    <label className="form-label">Day of month</label>
                    <input
                      {...register('recurringDayOfMonth', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="31"
                      className="form-input"
                    />
                    {errors.recurringDayOfMonth && (
                      <p className="text-red-500 text-xs mt-1">{errors.recurringDayOfMonth.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="form-label">Recurrence start date</label>
                  <input {...register('recurringStartDate')} type="date" className="form-input" />
                  {errors.recurringStartDate && (
                    <p className="text-red-500 text-xs mt-1">{errors.recurringStartDate.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : transaction ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
