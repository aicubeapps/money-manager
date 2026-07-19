import { useState } from 'react';
import { HiPencil, HiTrash, HiPlus } from 'react-icons/hi';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { getMiscAmount, sumAllocations } from '../../utils/budget';
import { getCategorySpend } from '../../utils/budgetSpend';
import type { Budget, Category, Tag, Transaction } from '../../types';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import FilteredTransactionView, { type TransactionFilterDescriptor } from '../common/FilteredTransactionView';
import { useTheme } from '../../hooks/useTheme';

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
  const { theme } = useTheme();
  const [drillDown, setDrillDown] = useState<{ title: string; filter: TransactionFilterDescriptor } | null>(null);

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return {
      name: category?.name || 'Unknown',
      icon: category?.icon || '📌',
    };
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);

  // Compute totals used by both cyberpunk and normal renders
  const budgetStats = budgets.map((budget) => {
    const spent = budget.allocations.reduce(
      (s, alloc) => s + getCategorySpend(transactions, tags, alloc.categoryId, budget.month, budget.year),
      0,
    );
    return { budget, spent, remaining: budget.amount - spent };
  });
  const totalSpent = budgetStats.reduce((s, { spent }) => s + spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCount = budgetStats.filter(({ spent, budget }) => spent > budget.amount).length;

  {/* CYBERPUNK THEME */}
  if (theme === 'cyberpunk') {
    const cpFont: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" };
    return (
      <div style={{ ...cpFont, color: '#00FF41' }} className="space-y-4 animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '18px', letterSpacing: '0.08em' }}>[BUDGETS]</div>
            <div style={{ fontSize: '11px', color: '#008F11', letterSpacing: '0.06em' }}>
              BUDGET_COUNT: {budgets.length}
            </div>
          </div>
          <button onClick={onAdd} className="btn-primary text-sm">+ ADD_BUDGET</button>
        </div>

        {/* Over-budget alert */}
        {overBudgetCount > 0 && (
          <div style={{ border: '1px solid rgba(255,0,64,0.4)', background: 'rgba(255,0,64,0.05)', padding: '10px 14px', color: '#FF0040', fontSize: '12px', letterSpacing: '0.06em' }}>
            !! WARNING: {overBudgetCount} BUDGET{overBudgetCount > 1 ? 'S' : ''} EXCEED_LIMIT !!
          </div>
        )}

        {/* Summary */}
        {budgets.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { label: 'BUDGETED', value: totalBudgeted, color: '#00FFFF' },
              { label: 'SPENT', value: totalSpent, color: '#FF0040' },
              { label: 'REMAINING', value: Math.abs(totalRemaining), color: totalRemaining >= 0 ? '#00FF41' : '#FF0040' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#000000', border: '1px solid rgba(0,255,65,0.2)', padding: '10px' }}>
                <div style={{ color: '#008F11', fontSize: '9px', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
                <div style={{ color, fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(value)}</div>
              </div>
            ))}
          </div>
        )}

        {budgets.length === 0 ? (
          <div style={{ color: '#008F11', padding: '24px', textAlign: 'center', border: '1px solid rgba(0,255,65,0.2)' }}>
            NO_BUDGETS_CONFIGURED // ADD_FIRST_BUDGET
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {budgetStats.map(({ budget, spent, remaining }) => {
              const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
              const isOverBudget = percentage > 100;
              const isWarning = percentage >= 80 && !isOverBudget;
              const monthLabel = `${MONTH_NAMES[budget.month - 1].toUpperCase()} ${budget.year}`;
              const statusTag = isOverBudget ? '[MAX_LIMIT]' : isWarning ? '[WARNING]' : '[OPTIMAL]';
              const statusColor = isOverBudget ? '#FF0040' : isWarning ? '#FFFF00' : '#00FF41';

              // 10-segment bar
              const filledCount = Math.min(Math.round(percentage / 10), 10);
              return (
                <div
                  key={budget.id}
                  style={{ background: '#000000', border: '1px solid rgba(0,255,65,0.25)', padding: '12px' }}
                  className="group"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ color: '#00FF41', fontSize: '13px', letterSpacing: '0.06em', fontWeight: 'bold' }}>
                        {monthLabel}
                      </div>
                      <div style={{ color: '#008F11', fontSize: '10px' }}>
                        {formatCurrency(budget.amount)} TOTAL
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', opacity: 0 }} className="group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(budget)} style={{ background: 'transparent', border: '1px solid rgba(0,255,65,0.3)', color: '#00CC33', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>EDIT</button>
                      <button onClick={() => setDeleteTarget(budget.id)} style={{ background: 'transparent', border: '1px solid rgba(255,0,64,0.3)', color: '#FF0040', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>DEL</button>
                    </div>
                  </div>

                  {/* Spend info */}
                  <div style={{ fontSize: '11px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#00CC33' }}>SPENT: {formatCurrency(spent)}</span>
                    <span style={{ color: '#008F11' }}>OF: {formatCurrency(budget.amount)}</span>
                  </div>

                  {/* Segmented bar */}
                  <div className="cp-seg-bar">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const filled = i < filledCount;
                      const cls = filled
                        ? isOverBudget ? 'cp-seg filled-red'
                          : isWarning ? 'cp-seg filled-yellow'
                          : 'cp-seg filled-green'
                        : 'cp-seg empty';
                      return <div key={i} className={cls} />;
                    })}
                  </div>

                  {/* Status */}
                  <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: statusColor, fontSize: '11px', border: `1px solid ${statusColor}40`, padding: '1px 6px' }}>
                      {statusTag}
                    </span>
                    <span style={{ fontSize: '10px', color: '#008F11' }}>
                      [{percentage.toFixed(0)}%]
                    </span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: remaining >= 0 ? '#00CC33' : '#FF0040' }}>
                    {remaining >= 0 ? `REMAINING: ${formatCurrency(remaining)}` : `OVER: ${formatCurrency(Math.abs(remaining))}`}
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
  }

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
                    const spend = getCategorySpend(transactions, tags, allocation.categoryId, budget.month, budget.year);
                    const percentage = allocation.amount > 0 ? (spend / allocation.amount) * 100 : 0;
                    const isOver = percentage >= 100;
                    const isWarning = percentage >= 80 && !isOver;

                    return (
                      <div
                        key={allocation.categoryId}
                        onClick={() => setDrillDown({
                          title: `${name} · ${MONTH_NAMES[budget.month - 1]} ${budget.year} Budget`,
                          filter: { kind: 'budgetCategory', categoryId: allocation.categoryId, month: budget.month, year: budget.year },
                        })}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg -mx-1.5 px-1.5 py-0.5 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <span>{icon}</span> {name}
                          {isOver && (
                            <span className="badge text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30">
                              Over budget
                            </span>
                          )}
                          {isWarning && (
                            <span className="badge text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30">
                              {Math.round(percentage)}% used
                            </span>
                          )}
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
