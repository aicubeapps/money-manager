import { useMemo, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { BUDGET_TEMPLATES } from '../../constants/budgetTemplates';
import type { Budget, Category } from '../../types';

export interface TemplateBudgetInput {
  categoryId: string;
  amount: number;
}

interface BudgetTemplateModalProps {
  categories: Category[];
  existingBudgets: Budget[];
  onApply: (items: TemplateBudgetInput[]) => Promise<void> | void;
  onCancel: () => void;
}

const BudgetTemplateModal = ({ categories, existingBudgets, onApply, onCancel }: BudgetTemplateModalProps) => {
  const [templateId, setTemplateId] = useState(BUDGET_TEMPLATES[0].id);
  const [income, setIncome] = useState('');
  const [saving, setSaving] = useState(false);

  const template = BUDGET_TEMPLATES.find((t) => t.id === templateId) ?? BUDGET_TEMPLATES[0];
  const incomeNum = Number(income);

  const { matched, unmatched, skipped } = useMemo(() => {
    const expenseCats = categories.filter((c) => c.type === 'expense' && c.active);
    const budgetedIds = new Set(existingBudgets.map((b) => b.categoryId));
    const usedIds = new Set<string>();
    const matched: { label: string; category: Category; amount: number }[] = [];
    const unmatched: string[] = [];
    const skipped: string[] = [];

    template.items.forEach((item) => {
      const cat = expenseCats.find(
        (c) =>
          !usedIds.has(c.id) &&
          item.keywords.some((k) => c.name.toLowerCase().includes(k))
      );
      if (!cat) {
        unmatched.push(item.label);
        return;
      }
      usedIds.add(cat.id);
      if (budgetedIds.has(cat.id)) {
        skipped.push(cat.name);
        return;
      }
      matched.push({
        label: item.label,
        category: cat,
        amount: Math.round((incomeNum * item.percent) / 100),
      });
    });
    return { matched, unmatched, skipped };
  }, [template, categories, existingBudgets, incomeNum]);

  const canApply = incomeNum > 0 && matched.length > 0 && !saving;

  const handleApply = async () => {
    setSaving(true);
    try {
      await onApply(matched.map((m) => ({ categoryId: m.category.id, amount: m.amount })));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Apply budget template</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Template</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="form-input">
              {BUDGET_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
          </div>

          <div>
            <label className="form-label">Monthly income (₹)</label>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="form-input"
              placeholder="e.g. 50000"
            />
          </div>

          {incomeNum > 0 && (
            <div className="space-y-2">
              {matched.map((m) => (
                <div key={m.category.id} className="flex justify-between text-sm text-gray-900 dark:text-white">
                  <span>{m.category.icon || '📌'} {m.category.name}</span>
                  <span className="font-medium">₹{m.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
              {matched.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No new budgets to create from this template.
                </p>
              )}
              {skipped.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Already budgeted, skipped: {skipped.join(', ')}
                </p>
              )}
              {unmatched.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No matching category, skipped: {unmatched.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetTemplateModal;
