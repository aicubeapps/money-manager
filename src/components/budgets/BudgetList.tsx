import { useState } from 'react';
import { HiPencil, HiTrash, HiPlus } from 'react-icons/hi';
import { formatCurrency } from '../../utils/format';
import { getMiscAmount, sumAllocations } from '../../utils/budget';
import type { Budget, Category } from '../../types';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';

interface BudgetListProps {
  budgets: Budget[];
  categories: Category[];
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BudgetList = ({ budgets, categories, onEdit, onDelete, onAdd }: BudgetListProps) => {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return {
      name: category?.name || 'Unknown',
      icon: category?.icon || '📌',
    };
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{budgets.length} budget{budgets.length !== 1 ? 's' : ''} set</p>
        </div>
        <button onClick={onAdd} className="btn-primary text-sm">
          <HiPlus className="w-4 h-4" /> Add Budget
        </button>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="card p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Budgeted</div>
          <div className="font-bold text-primary-600 dark:text-primary-400">{formatCurrency(totalBudgeted)}</div>
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No budgets set"
          description="Set an overall monthly budget and split it across categories."
          action={
            <button onClick={onAdd} className="btn-primary text-sm">
              <HiPlus className="w-4 h-4" /> Create your first budget
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const allocated = sumAllocations(budget.allocations);
            const misc = getMiscAmount(budget.amount, budget.allocations);

            return (
              <div key={budget.id} className="card p-4 group hover:shadow-md transition-all duration-150">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {MONTH_NAMES[budget.month - 1]} {budget.year}
                    </h3>
                    <span className="text-xs text-gray-500">{formatCurrency(budget.amount)} overall</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(budget)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <HiPencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => setDeleteTarget(budget.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <HiTrash className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {budget.allocations.map((allocation) => {
                    const { name, icon } = getCategoryInfo(allocation.categoryId);
                    return (
                      <div key={allocation.categoryId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <span>{icon}</span> {name}
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">{formatCurrency(allocation.amount)}</span>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between text-xs pt-1.5 mt-1.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">📦 Misc</span>
                    <span className={`font-medium ${misc < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {misc < 0 ? `(${formatCurrency(Math.abs(misc))})` : formatCurrency(misc)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>Allocated</span>
                    <span>{formatCurrency(allocated)} of {formatCurrency(budget.amount)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete budget"
        message="This budget will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
};

export default BudgetList;
