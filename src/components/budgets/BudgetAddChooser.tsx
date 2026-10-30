import { HiX } from 'react-icons/hi';

interface BudgetAddChooserProps {
  hasTemplates: boolean;
  onUseTemplate: () => void;
  onCreateTemplate: () => void;
  onAddSingle: () => void;
  onCancel: () => void;
}

const BudgetAddChooser = ({
  hasTemplates,
  onUseTemplate,
  onCreateTemplate,
  onAddSingle,
  onCancel,
}: BudgetAddChooserProps) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
      <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Budget</h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <HiX className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        {hasTemplates && (
          <button onClick={onUseTemplate} className="btn-primary w-full justify-center">
            Use existing template
          </button>
        )}
        <button
          onClick={onCreateTemplate}
          className={`${hasTemplates ? 'btn-secondary' : 'btn-primary'} w-full justify-center`}
        >
          {hasTemplates ? 'Create new template' : 'Create budget template'}
        </button>
        <button onClick={onAddSingle} className="btn-secondary w-full justify-center">
          Add single budget
        </button>
      </div>
    </div>
  </div>
);

export default BudgetAddChooser;
