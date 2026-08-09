import { useState } from 'react';
import { HiPencil, HiTrash, HiPlus, HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { getMiscAmount, sumAllocations } from '../../utils/budget';
import { getCategorySpend, getTotalSpend, getUnaccountedSpend } from '../../utils/budgetSpend';
import type { Budget, Category, Tag, Transaction } from '../../types';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import FilteredTransactionView, { type TransactionFilterDescriptor } from '../common/FilteredTransactionView';
import BudgetWeeklyChart from './BudgetWeeklyChart';

interface BudgetListProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  tags: Tag[];
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BudgetList = ({ budgets, categories, transactions, tags, onEdit, onDelete, onAdd }: BudgetListProps) => {
  const formatCurrency = useFormatCurrency();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<{ title: string; filter: TransactionFilterDescriptor } | null>(null);
  const [unaccountedExpanded, setUnaccountedExpanded] = useState(false);

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return {
      name: category?.name || 'Unknown',
      icon: category?.icon || '📌',
      color: category?.color,
    };
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);

  // Global progress bar (4b): total budgeted vs. total expenditure across
  // whatever budget(s) are currently shown (in practice always the single
  // budget for the month BudgetsPage has navigated to — budgets here is
  // already month/year-scoped by useBudgets). Category contribution % is
  // computed against this same total so the legend always adds up to it.
  const totalSpentAcrossBudgets = budgets.reduce(
    (sum, b) => sum + getTotalSpend(transactions, tags, b.month, b.year),
    0
  );
  const categoryContributions = budgets
    .flatMap((b) => b.allocations.map((a) => ({ budget: b, categoryId: a.categoryId })))
    .map(({ budget, categoryId }) => {
      const info = getCategoryInfo(categoryId);
      return {
        categoryId,
        name: info.name,
        color: info.color,
        spend: getCategorySpend(transactions, tags, categoryId, budget.month, budget.year),
      };
    })
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .map((c) => ({
      ...c,
      percent: totalSpentAcrossBudgets > 0 ? (c.spend / totalSpentAcrossBudgets) * 100 : 0,
    }));

  const primaryBudget = budgets[0];
  const budgetedCategoryIds = new Set(budgets.flatMap((b) => b.allocations.map((a) => a.categoryId)));
  const unaccountedCategories = primaryBudget
    ? getUnaccountedSpend(transactions, tags, budgetedCategoryIds, primaryBudget.month, primaryBudget.year)
        .map((c) => {
          const info = getCategoryInfo(c.categoryId);
          return { ...c, name: info.name, color: info.color };
        })
    : [];
  const totalUnaccountedSpend = unaccountedCategories.reduce((sum, c) => sum + c.spent, 0);
  const totalBudgetedCategorySpend = categoryContributions.reduce((sum, c) => sum + c.spend, 0);
  const barDenominator = Math.max(totalBudgeted, totalBudgetedCategorySpend + totalUnaccountedSpend) || 1;

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

      {/* Global progress bar + category contribution legend */}
      {budgets.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Overall Progress</span>
            <span>{formatCurrency(totalSpentAcrossBudgets)} of {formatCurrency(totalBudgeted)}</span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {categoryContributions.map((c) => (
              <div
                key={c.categoryId}
                className="h-full flex-shrink-0"
                style={{
                  width: `${(c.spend / barDenominator) * 100}%`,
                  backgroundColor: c.color || '#6366f1',
                }}
              />
            ))}
            {totalUnaccountedSpend > 0 && (
              <div
                className="h-full flex-shrink-0"
                style={{
                  width: `${(totalUnaccountedSpend / barDenominator) * 100}%`,
                  backgroundColor: '#ef4444',
                }}
              />
            )}
          </div>
          {(categoryContributions.length > 0 || totalUnaccountedSpend > 0) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
              {categoryContributions.map((c) => (
                <span key={c.categoryId} className="flex items-center gap-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                  {c.percent.toFixed(0)}%
                </span>
              ))}
              {totalUnaccountedSpend > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-red-600 dark:text-red-400">Unaccounted</span>
                  {totalSpentAcrossBudgets > 0 ? ((totalUnaccountedSpend / totalSpentAcrossBudgets) * 100).toFixed(0) : 0}%
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No budgets set"
          description="Set an overall monthly budget and split it across categories."
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

                <div className="space-y-3">
                  {budget.allocations.map((allocation) => {
                    const { name, icon, color: categoryColor } = getCategoryInfo(allocation.categoryId);
                    const spend = getCategorySpend(transactions, tags, allocation.categoryId, budget.month, budget.year);
                    const remaining = allocation.amount - spend;
                    const percentage = allocation.amount > 0 ? (spend / allocation.amount) * 100 : 0;
                    const isOver = percentage >= 100;

                    return (
                      <div
                        key={allocation.categoryId}
                        onClick={() => setDrillDown({
                          title: `${name} · ${MONTH_NAMES[budget.month - 1]} ${budget.year} Budget`,
                          filter: { kind: 'budgetCategory', categoryId: allocation.categoryId, month: budget.month, year: budget.year },
                        })}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg -mx-1.5 px-1.5 py-1 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
                            <span>{icon}</span> {name}
                          </span>
                          <span className={`font-semibold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(percentage, 100)}%`,
                              backgroundColor: isOver ? '#ef4444' : (categoryColor || '#6366f1'),
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                          <span>{formatCurrency(spend)} of {formatCurrency(allocation.amount)}</span>
                          <span className={remaining < 0 ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                            {remaining < 0 ? `Over by ${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} left`}
                          </span>
                        </div>
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

      {/* Unaccounted spend — categories with expense transactions this month
          but no budget allocation. Collapsed into a single red summary row
          that expands to show per-category detail and drill-down. */}
      {budgets.length > 0 && unaccountedCategories.length > 0 && (
        <div className="card p-4">
          <button
            className="w-full flex items-center justify-between text-sm"
            onClick={() => setUnaccountedExpanded((v) => !v)}
            aria-expanded={unaccountedExpanded}
          >
            <span className="font-semibold text-red-600 dark:text-red-400">Unaccounted</span>
            <span className="flex items-center gap-2">
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(totalUnaccountedSpend)}
              </span>
              {unaccountedExpanded
                ? <HiChevronUp className="w-4 h-4 text-red-400" />
                : <HiChevronDown className="w-4 h-4 text-red-400" />}
            </span>
          </button>

          {unaccountedExpanded && (
            <div className="mt-3 space-y-0.5 border-t border-gray-100 dark:border-gray-700 pt-3">
              {unaccountedCategories.map((c) => (
                <div
                  key={c.categoryId}
                  onClick={() => primaryBudget && setDrillDown({
                    title: `${c.name} · ${MONTH_NAMES[primaryBudget.month - 1]} ${primaryBudget.year}`,
                    filter: { kind: 'budgetCategory', categoryId: c.categoryId, month: primaryBudget.month, year: primaryBudget.year },
                  })}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg -mx-1.5 px-1.5 py-1.5 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.color || '#ef4444' }}
                    />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{c.name}</span>
                  </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(c.spent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly stacked bar chart(s) — one per budget shown (in practice
          just the single month BudgetsPage has navigated to), placed
          full-width below the card grid rather than inside each narrow
          card so the chart has room to breathe. */}
      {budgets.filter((b) => b.allocations.length > 0).map((budget) => (
        <div key={budget.id} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Weekly Breakdown · {MONTH_NAMES[budget.month - 1]} {budget.year}
          </h3>
          <BudgetWeeklyChart budget={budget} categories={categories} transactions={transactions} tags={tags} />
        </div>
      ))}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete budget"
        message="This budget will be permanently deleted."
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

export default BudgetList;
