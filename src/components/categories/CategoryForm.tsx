import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HiX } from 'react-icons/hi';
import type { Category } from '../../types';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(40),
  type: z.enum(['expense', 'income']),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type FormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: Category | null;
  onSave: (data: FormData) => void;
  onCancel: () => void;
}

const SUGGESTED_EXPENSE_ICONS = ['🍔', '🚗', '🏠', '💊', '🎬', '🛒', '✈️', '📚', '💡', '🏋️', '👗', '🍕'];
const SUGGESTED_INCOME_ICONS = ['💼', '💰', '📈', '🏦', '🎁', '💵', '🤝', '🖥️', '🏆', '💹'];
const PRESET_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

const CategoryForm = ({ category, onSave, onCancel }: CategoryFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? { name: category.name, type: category.type, icon: category.icon || '', color: category.color || '#6366f1' }
      : { type: 'expense', icon: '📌', color: '#6366f1' },
  });

  const typeValue = watch('type');
  const iconValue = watch('icon');
  const colorValue = watch('color');

  useEffect(() => {
    if (category) {
      reset({ name: category.name, type: category.type, icon: category.icon || '', color: category.color || '#6366f1' });
    }
  }, [category, reset]);

  const suggestedIcons = typeValue === 'income' ? SUGGESTED_INCOME_ICONS : SUGGESTED_EXPENSE_ICONS;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <span className="text-3xl">{iconValue || '📌'}</span>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{watch('name') || 'Category Name'}</div>
              <div className="text-xs text-gray-500 capitalize">{typeValue}</div>
            </div>
            <div className="ml-auto w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: colorValue || '#6366f1' }} />
          </div>

          {/* Type */}
          <div>
            <label className="form-label">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" {...register('type')} value={t} className="sr-only" />
                  <div className={`border-2 rounded-xl p-3 text-center text-sm font-medium transition-all duration-150 capitalize ${
                    typeValue === t
                      ? t === 'expense'
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                  }`}>
                    {t === 'expense' ? '💸 Expense' : '💰 Income'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="form-label">Category Name</label>
            <input {...register('name')} className="form-input" placeholder="e.g., Food & Dining" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Icon */}
          <div>
            <label className="form-label">Icon</label>
            <input {...register('icon')} className="form-input mb-2" placeholder="Paste any emoji, e.g. 🍔" />
            <div className="flex flex-wrap gap-1.5">
              {suggestedIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setValue('icon', emoji)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                    iconValue === emoji ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="form-label">Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`w-8 h-8 rounded-full transition-all ${colorValue === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input {...register('color')} type="color" className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-1 bg-white dark:bg-gray-700" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              type="submit"
              onClick={handleSubmit(onSave)}
              disabled={isSubmitting}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : category ? 'Save changes' : 'Add Category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;
