import { useState } from 'react';
import { HiPencil, HiTrash, HiPlus, HiExclamation } from 'react-icons/hi';
import { formatCurrency } from '../../utils/format';
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
      color: category?.color || '#6366f1',
    };
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCount = budgets.filter(b => (b.spent || 0) > b.amount).length;

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

      {/* Over-budget alert */}
      {overBudgetCount > 0 && (
        <div className="card p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 flex items-center gap-3">
          <HiExclamation className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            {overBudgetCount} budget{overBudgetCount > 1 ? 's are' : ' is'} over limit this month
          </p>
        </div>
      )}

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Budgeted</div>
            <div className="font-bold text-primary-600 dark:text-primary-400">{formatCurrency(totalBudgeted)}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Spent</div>
            <div className="font-bold text-red-600 dark:text-red-400">{formatCurrency(totalSpent)}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</div>
            <div className={`font-bold ${totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(Math.abs(totalRemaining))}
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No budgets set"
          description="Set monthly spending limits per category to stay on track."
          action={
            <button onClick={onAdd} className="btn-primary text-sm">
              <HiPlus className="w-4 h-4" /> Create your first budget
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const spent = budget.spent || 0;
            const remaining = budget.amount - spent;
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const isOverBudget = percentage > 100;
            const isWarning = percentage >= 80 && !isOverBudget;
            const { name, icon } = getCategoryInfo(budget.categoryId);

            const barColor = isOverBudget
              ? 'bg-red-500'
              : isWarning
              ? 'bg-amber-500'
              : 'bg-primary-500';

            return (
              <div key={budget.id} className="card p-4 group hover:shadow-md transition-all duration-150">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{name}</h3>
                      <span className="text-xs text-gray-500">{MONTH_NAMES[budget.month - 1]} {budget.year}</span>
                    </div>
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

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Spent: <strong className="text-gray-700 dark:text-gray-300">{formatCurrency(spent)}</strong></span>
                    <span>of <strong className="text-gray-700 dark:text-gray-300">{formatCurrency(budget.amount)}</strong></span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className={`font-semibold ${isOverBudget ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>
                      {percentage.toFixed(0)}% used
                    </span>
                    <span className={`font-semibold ${remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
                    </span>
                  </div>
                </div>

                {isOverBudget && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                    <HiExclamation className="w-3.5 h-3.5" /> Over budget
                  </div>
                )}
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
