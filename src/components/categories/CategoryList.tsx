import { useState } from 'react';
import { HiPencil, HiEyeOff, HiEye, HiTrash, HiPlus } from 'react-icons/hi';
import type { Category } from '../../types';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import FilteredTransactionView, { type TransactionFilterDescriptor } from '../common/FilteredTransactionView';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDisable: (id: string) => void;
  onEnable: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

type FilterType = 'all' | 'expense' | 'income';

const CategoryList = ({ categories, onEdit, onDisable, onEnable, onDelete, onAdd }: CategoryListProps) => {
  const [filter, setFilter] = useState<FilterType>('expense');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<{ title: string; filter: TransactionFilterDescriptor } | null>(null);

  const filtered = categories.filter((cat) => filter === 'all' || cat.type === filter);
  const expenseCount = categories.filter(c => c.type === 'expense').length;
  const incomeCount = categories.filter(c => c.type === 'income').length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {expenseCount} expense · {incomeCount} income
          </p>
        </div>
        <button onClick={onAdd} className="btn-primary text-sm">
          <HiPlus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Filter */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 w-fit">
        {(['expense', 'income', 'all'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all duration-150 capitalize ${
              filter === f
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="No categories yet"
          description="Create categories to organize your transactions."
          action={
            <button onClick={onAdd} className="btn-primary text-sm">
              <HiPlus className="w-4 h-4" /> Add Category
            </button>
          }
        />
      ) : (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((category) => (
            <div
              key={category.id}
              onClick={() => setDrillDown({
                title: `${category.name} · All Transactions`,
                filter: { kind: 'category', categoryId: category.id },
              })}
              role="button"
              tabIndex={0}
              className={`card p-3.5 flex items-center justify-between group hover:shadow-md transition-all duration-150 cursor-pointer ${!category.active ? 'opacity-50' : ''}`}
              style={{ borderLeft: `3px solid ${category.color || '#6366f1'}` }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl flex-shrink-0">{category.icon || '📂'}</span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{category.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {category.type}{!category.active && ' · hidden'}
                  </div>
                </div>
              </div>
              <div
                className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => onEdit(category)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                  <HiPencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {category.active ? (
                  <button onClick={() => onDisable(category.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Hide">
                    <HiEyeOff className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                ) : (
                  <button onClick={() => onEnable(category.id)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Show">
                    <HiEye className="w-3.5 h-3.5 text-green-500" />
                  </button>
                )}
                <button onClick={() => setDeleteTarget(category.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                  <HiTrash className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete category"
        message="This will permanently delete the category. Existing transactions won't be affected."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />

      {drillDown && (
        <FilteredTransactionView
          isOpen
          title={drillDown.title}
          filter={drillDown.filter}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
};

export default CategoryList;
