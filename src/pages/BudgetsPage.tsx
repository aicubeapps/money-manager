import { useEffect, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useTags } from '../hooks/useTags';
import { useAuth } from '../hooks/useAuth';
import BudgetList from '../components/budgets/BudgetList';
import BudgetForm from '../components/budgets/BudgetForm';
import { createBudget, updateBudget, deleteBudget } from '../services/budgetService';
import { isCategoryOvershot } from '../utils/budgetSpend';
import { mergeAllocations } from '../utils/budget';
import { toast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Budget } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BudgetsPage = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const { currentUser } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { budgets, loading, error } = useBudgets(selectedMonth, selectedYear);
  const { budgets: currentMonthBudgets } = useBudgets(currentMonth, currentYear);
  const { categories } = useCategories();
  const { transactions } = useTransactions();
  const { tags } = useTags();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // One-time-per-session overshoot toast, scoped to the actual current month
  // (not whatever month is being navigated to below). We track which
  // categoryId|month|year combos already fired a toast in an in-memory ref —
  // no persistence across reloads/sessions, per the ask. On the very first
  // time this effect sees real current-month budget data, we seed the
  // "already shown" set with anything already over 100% instead of toasting,
  // so opening the page doesn't spam toasts for pre-existing overshoots.
  // Only overshoots that newly appear in a later effect run (e.g. after a
  // new transaction pushes a category over) trigger a toast.
  const shownOvershootsRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);

  useEffect(() => {
    const currentBudget = currentMonthBudgets[0];
    if (!currentBudget) return;

    const overshotCategoryIds = currentBudget.allocations
      .filter((a) => isCategoryOvershot(currentBudget, a.categoryId, transactions, tags))
      .map((a) => a.categoryId);

    if (!seededRef.current) {
      overshotCategoryIds.forEach((categoryId) =>
        shownOvershootsRef.current.add(`${categoryId}|${currentBudget.month}|${currentBudget.year}`)
      );
      seededRef.current = true;
      return;
    }

    overshotCategoryIds.forEach((categoryId) => {
      const key = `${categoryId}|${currentBudget.month}|${currentBudget.year}`;
      if (shownOvershootsRef.current.has(key)) return;
      shownOvershootsRef.current.add(key);
      const categoryName = categories.find((c) => c.id === categoryId)?.name || 'A category';
      toast.error(`${categoryName} has gone over its ${MONTH_NAMES[currentBudget.month - 1]} budget`);
    });
  }, [currentMonthBudgets, transactions, tags, categories]);

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

  // "Add Budget" used to always open the form in create mode, even when a
  // budget doc already existed for the month being viewed — every save then
  // called createBudget, producing a second doc for the same userId/month/year
  // (BudgetList renders one card per doc AND sums `amount` across all of them
  // for "Total Budgeted", so duplicates showed as extra cards with an
  // inflated total). Since `budgets` here is already scoped to
  // selectedMonth/selectedYear by useBudgets, budgets[0] (if present) IS the
  // existing doc for the month being viewed — open it for editing instead.
  const handleAdd = () => { setEditingBudget(budgets[0] ?? null); setShowForm(true); };
  const handleEdit = (budget: Budget) => { setEditingBudget(budget); setShowForm(true); };

  const handleSave = async (data: { month: number; year: number; amount: number; allocations: { categoryId: string; amount: number }[] }) => {
    if (!currentUser) return;
    try {
      // Safety net in addition to the handleAdd fix above: re-check for an
      // existing doc for the month right before deciding create vs update,
      // in case editingBudget is stale (e.g. state not set for some reason).
      const existing = editingBudget ?? budgets[0] ?? null;
      if (existing) {
        const merged = editingBudget
          ? data.allocations // form was initialized from the existing doc, so this is already the full merged set
          : mergeAllocations(existing.allocations, data.allocations);
        await updateBudget(existing.id, { ...data, allocations: merged, month: selectedMonth, year: selectedYear });
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
        transactions={transactions}
        tags={tags}
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
