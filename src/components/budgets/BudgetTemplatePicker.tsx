import { useState } from 'react';
import { HiX, HiPencil, HiTrash } from 'react-icons/hi';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatCurrency } from '../../utils/format';
import type { Category } from '../../types';
import type { BudgetTemplate } from '../../types/budgetTemplate';

interface BudgetTemplatePickerProps {
  templates: BudgetTemplate[];
  categories: Category[];
  monthLabel: string;
  onApply: (template: BudgetTemplate) => Promise<void> | void;
  onEdit: (template: BudgetTemplate) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

const BudgetTemplatePicker = ({ templates, categories, monthLabel, onApply, onEdit, onDelete, onCancel }: BudgetTemplatePickerProps) => {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleApply = async (template: BudgetTemplate) => {
    setApplyingId(template.id);
    try {
      await onApply(template);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Use template</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Applies to {monthLabel}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="card p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">{template.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white mr-1">
                    {formatCurrency(template.amount)}
                  </span>
                  <button onClick={() => onEdit(template)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" aria-label="Edit template">
                    <HiPencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button onClick={() => setDeleteTarget(template.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" aria-label="Delete template">
                    <HiTrash className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {template.allocations.map((a) => {
                  const cat = categories.find((c) => c.id === a.categoryId);
                  return (
                    <div key={a.categoryId} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{cat ? `${cat.icon || '📌'} ${cat.name}` : 'Unknown category'}</span>
                      <span>{formatCurrency(a.amount)}</span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => handleApply(template)}
                disabled={applyingId !== null}
                className="btn-primary w-full justify-center text-sm disabled:opacity-50"
              >
                {applyingId === template.id ? 'Applying...' : 'Apply'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete template"
        message="This template will be permanently deleted. Budgets already created from it are not affected."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
};

export default BudgetTemplatePicker;
