import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HiX } from 'react-icons/hi';
import type { Account, AccountGroup } from '../../types';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  type: z.enum(['savings', 'current', 'credit', 'cash', 'upi'] as const),
  openingBalance: z.number().min(0, 'Balance must be 0 or more'),
  openingDate: z.string().min(1, 'Date is required'),
  creditLimit: z.number().optional(),
  statementDate: z.number().min(1).max(31).optional(),
  dueDate: z.number().min(1).max(31).optional(),
});

type FormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: Account | null;
  onSave: (data: FormData & { accountGroup: AccountGroup }) => void;
  onCancel: () => void;
}

const ACCOUNT_TYPES = [
  { value: 'savings', label: '🏦 Savings' },
  { value: 'current', label: '💼 Current' },
  { value: 'credit', label: '💳 Credit Card' },
  { value: 'cash', label: '💵 Cash Wallet' },
  { value: 'upi', label: '📱 UPI Wallet' },
] as const;

const getAccountGroupFromType = (type: FormData['type']): AccountGroup => {
  return type === 'credit' ? 'liability' : 'asset';
};

const formatDateForInput = (value: unknown): string => {
  if (!value) return new Date().toISOString().split('T')[0];

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    date = (value as { toDate: () => Date }).toDate();
  } else {
    date = new Date(value as string | number | Date);
  }

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return date.toISOString().split('T')[0];
};

const AccountForm = ({ account, onSave, onCancel }: AccountFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          openingBalance: account.openingBalance,
          openingDate: formatDateForInput(account.openingDate),
          creditLimit: account.creditLimit,
          statementDate: account.statementDate,
          dueDate: account.dueDate,
        }
      : {
          name: '',
          type: 'savings',
          openingBalance: 0,
          openingDate: new Date().toISOString().split('T')[0],
        },
  });

  const accountType = watch('type');
  const derivedAccountGroup = getAccountGroupFromType(accountType);

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type,
        openingBalance: account.openingBalance,
        openingDate: formatDateForInput(account.openingDate),
        creditLimit: account.creditLimit,
        statementDate: account.statementDate,
        dueDate: account.dueDate,
      });
    } else {
      reset({
        name: '',
        type: 'savings',
        openingBalance: 0,
        openingDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [account, reset]);

  useEffect(() => {
    if (accountType !== 'credit') {
      setValue('creditLimit', undefined);
      setValue('statementDate', undefined);
      setValue('dueDate', undefined);
    }
  }, [accountType, setValue]);

  const handleFormSubmit = (data: FormData) => {
    const cleanedData =
      data.type === 'credit'
        ? data
        : {
            ...data,
            creditLimit: undefined,
            statementDate: undefined,
            dueDate: undefined,
          };

    onSave({
      ...cleanedData,
      accountGroup: getAccountGroupFromType(data.type),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {account ? 'Edit Account' : 'Add Account'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Account Name</label>
            <input
              {...register('name')}
              className="form-input"
              placeholder="e.g., HDFC Savings"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Account Type</label>
            <select {...register('type')} className="form-input">
              {ACCOUNT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Account Classification
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                derivedAccountGroup === 'liability'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {derivedAccountGroup === 'liability' ? 'Liability' : 'Asset'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Credit cards are treated as liabilities. All other account types are treated as assets.
            </p>
          </div>

          <div>
            <label className="form-label">Opening Balance (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                {...register('openingBalance', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="form-input pl-7"
                placeholder="0.00"
              />
            </div>
            {errors.openingBalance && (
              <p className="text-red-500 text-xs mt-1">{errors.openingBalance.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Opening Date</label>
            <input {...register('openingDate')} type="date" className="form-input" />
            {errors.openingDate && (
              <p className="text-red-500 text-xs mt-1">{errors.openingDate.message}</p>
            )}
          </div>

          {accountType === 'credit' && (
            <>
              <div>
                <label className="form-label">
                  Credit Limit (₹) <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    {...register('creditLimit', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className="form-input pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Statement Day</label>
                  <input
                    {...register('statementDate', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="31"
                    className="form-input"
                    placeholder="1–31"
                  />
                </div>
                <div>
                  <label className="form-label">Due Day</label>
                  <input
                    {...register('dueDate', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="31"
                    className="form-input"
                    placeholder="1–31"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : account ? 'Save changes' : 'Add Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;