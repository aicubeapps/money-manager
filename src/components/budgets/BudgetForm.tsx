import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HiX, HiPlus, HiTrash } from 'react-icons/hi';
import type { Budget, Category } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getMiscAmount, sumAllocations } from '../../utils/budget';

const allocationSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
});

const budgetSchema = z
  .object({
    month: z.number().min(1).max(12),
    year: z.number().min(2000).max(2100),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    allocations: z.array(allocationSchema),
  })
  .refine(
    (data) => sumAllocations(data.allocations) <= data.amount,
    { message: 'Allocated amounts cannot exceed the overall budget', path: ['allocations'] }
  );

type FormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  budget?: Budget | null;
  categories: Category[];
  onSave: (data: FormData) => void;
  onCancel: () => void;
}

const BudgetForm = ({ budget, categories, onSave, onCancel }: BudgetFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: budget
      ? { month: budget.month, year: budget.year, amount: budget.amount, allocations: budget.allocations }
      : { month: new Date().getMonth() + 1, year: new Date().getFullYear(), allocations: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'allocations' });

  useEffect(() => {
    if (budget) {
      reset({ month: budget.month, year: budget.year, amount: budget.amount, allocations: budget.allocations });
    }
  }, [budget, reset]);

  const expenseCategories = categories.filter((c) => c.type === 'expense' && c.active);

  const overallAmount = watch('amount') || 0;
  const allocations = watch('allocations') || [];
  const miscAmount = getMiscAmount(overallAmount, allocations);
  const allocationsError = (errors.allocations as unknown as { message?: string })?.message;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {budget ? 'Edit Budget' : 'Add Budget'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Month</label>
              <select {...register('month', { valueAsNumber: true })} className="form-input">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Year</label>
              <select {...register('year', { valueAsNumber: true })} className="form-input">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Overall Monthly Budget (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="form-input pl-7"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Category Allocations</label>
              <button
                type="button"
                onClick={() => append({ categoryId: '', amount: 0 })}
                className="btn-secondary text-xs py-1 px-2"
              >
                <HiPlus className="w-3.5 h-3.5" /> Add category
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <select {...register(`allocations.${index}.categoryId`)} className="form-input flex-1">
                    <option value="">Select category</option>
                    {expenseCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon || '📌'} {cat.name}</option>
                    ))}
                  </select>
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input
                      {...register(`allocations.${index}.amount`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      className="form-input pl-6"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <HiTrash className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {fields.some((_, index) => errors.allocations?.[index]?.categoryId || errors.allocations?.[index]?.amount) && (
              <p className="text-red-500 text-xs mt-1">Each allocation needs a category and an amount greater than 0.</p>
            )}
            {allocationsError && <p className="text-red-500 text-xs mt-1">{allocationsError}</p>}
          </div>

          <div className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Misc (unallocated)</span>
            <span className={`text-sm font-semibold ${miscAmount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {formatCurrency(miscAmount)}
            </span>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              type="submit"
              onClick={handleSubmit(onSave)}
              disabled={isSubmitting}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : budget ? 'Save changes' : 'Add Budget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetForm;
