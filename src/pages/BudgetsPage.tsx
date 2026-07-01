import { useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../hooks/useAuth';
import BudgetList from '../components/budgets/BudgetList';
import BudgetForm from '../components/budgets/BudgetForm';
import { createBudget, updateBudget, deleteBudget } from '../services/budgetService';
import { toast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Budget } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BudgetsPage = () => {
  const now = new Date();
  const { currentUser } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const { budgets, loading, error } = useBudgets(selectedMonth, selectedYear);
  const { categories } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleAdd = () => { setEditingBudget(null); setShowForm(true); };
  const handleEdit = (budget: Budget) => { setEditingBudget(budget); setShowForm(true); };

  const handleSave = async (data: any) => {
    if (!currentUser) return;
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, data);
        toast.success('Budget updated');
      } else {
        await createBudget(currentUser.uid, { ...data, month: selectedMonth, year: selectedYear });
        toast.success('Budget created');
      }
      setShowForm(false);
      setEditingBudget(null);
    } catch (err) {
      console.error('Error saving budget:', err);
      toast.error('Failed to save budget');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      toast.success('Budget deleted');
    } catch (err) {
      toast.error('Failed to delete budget');
    }
  };

  if (loading) return <LoadingSpinner message="Loading budgets..." />;
  if (error) return <div className="card p-6 text-red-500 text-center">Error: {error}</div>;

  return (
    <>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Previous month"
        >
          <HiChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <span className="text-base font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Next month"
        >
          <HiChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <BudgetList
        budgets={budgets}
        categories={categories}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {showForm && (
        <BudgetForm
          budget={editingBudget}
          categories={categories}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingBudget(null); }}
        />
      )}
    </>
  );
};

export default BudgetsPage;
