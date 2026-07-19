import { useEffect, useState } from 'react';
import { HiPencil, HiTrash, HiX } from 'react-icons/hi';
import {
  getAllRecurringRules,
  updateRecurringRule,
  deleteRecurringRule,
} from '../../services/firestore/recurringRules';
import { useAuth } from '../../hooks/useAuth';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { getTags } from '../../services/tagService';
import { toast } from '../common/Toast';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import type { RecurringRule, RecurringFrequency, MonthlyWeekPosition, Tag, TransactionType } from '../../types';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Index = Date.getDay() convention (0=Sunday..6=Saturday), matching
// recurringDates.ts / date-fns nextDay(), not the ISO week (Monday=1).
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WEEK_POSITION_OPTIONS = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'third', label: 'Third' },
  { value: 'fourth', label: 'Fourth' },
  { value: 'last', label: 'Last' },
] as const;

type EditFormState = {
  type: TransactionType;
  amount: string;
  accountId: string;
  categoryId: string;
  description: string;
  tagId: string;
  frequency: RecurringFrequency;
  dayOfMonth: string;
  weekOfMonth: MonthlyWeekPosition | '';
  dayOfWeek: number | null;
  startDate: string;
  nextDueDate: string;
};

const toEditFormState = (rule: RecurringRule): EditFormState => ({
  type: rule.templateTransaction.type,
  amount: String(rule.templateTransaction.amount),
  accountId: rule.templateTransaction.accountId,
  categoryId: rule.templateTransaction.categoryId,
  description: rule.templateTransaction.description,
  tagId: rule.templateTransaction.tags?.[0] || '',
  frequency: rule.frequency,
  dayOfMonth: rule.dayOfMonth ? String(rule.dayOfMonth) : '',
  weekOfMonth: rule.weekOfMonth || '',
  dayOfWeek: typeof rule.dayOfWeek === 'number' ? rule.dayOfWeek : null,
  startDate: rule.startDate,
  nextDueDate: rule.nextDueDate,
});

const RecurringRulesList = () => {
  const formatCurrency = useFormatCurrency();
  const { currentUser } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [monthlySubMode, setMonthlySubMode] = useState<'specific-day' | 'week-position'>('specific-day');
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    if (!currentUser) {
      setRules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getAllRecurringRules(currentUser.uid);
      setRules(data);
    } catch (err) {
      console.error('Error fetching recurring rules:', err);
      toast.error('Failed to load recurring rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    getTags(currentUser.uid).then(setAllTags).catch(() => {});
  }, [currentUser]);

  const handleToggleActive = async (rule: RecurringRule) => {
    try {
      await updateRecurringRule(rule.id, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Recurring rule deactivated' : 'Recurring rule activated');
      fetchRules();
    } catch (err) {
      console.error('Error updating recurring rule:', err);
      toast.error('Failed to update recurring rule');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurringRule(id);
      toast.success('Recurring rule deleted');
      fetchRules();
    } catch (err) {
      console.error('Error deleting recurring rule:', err);
      toast.error('Failed to delete recurring rule');
    }
  };

  const openEdit = (rule: RecurringRule) => {
    setEditingRule(rule);
    setEditForm(toEditFormState(rule));
    setMonthlySubMode(rule.frequency === 'monthly' && rule.weekOfMonth ? 'week-position' : 'specific-day');
  };

  const closeEdit = () => {
    setEditingRule(null);
    setEditForm(null);
  };

  const handleEditSubmit = async () => {
    if (!editingRule || !editForm) return;

    const amount = parseFloat(editForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!editForm.accountId) {
      toast.error('Select an account');
      return;
    }

    const isYearly = editForm.frequency === 'yearly';
    const isMonthlySpecific = editForm.frequency === 'monthly' && monthlySubMode === 'specific-day';
    const isMonthlyWeekPos = editForm.frequency === 'monthly' && monthlySubMode === 'week-position';
    const isWeekly = editForm.frequency === 'weekly';

    const dayOfMonth = isYearly || isMonthlySpecific ? parseInt(editForm.dayOfMonth, 10) : undefined;
    if ((isYearly || isMonthlySpecific) && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
      toast.error('Day of month must be between 1 and 31');
      return;
    }

    if (isMonthlyWeekPos) {
      if (!editForm.weekOfMonth) { toast.error('Select a week position'); return; }
      if (editForm.dayOfWeek === null) { toast.error('Select a day of the week'); return; }
    }

    if (isWeekly && editForm.dayOfWeek === null) {
      toast.error('Select a day of the week');
      return;
    }

    setSaving(true);
    try {
      await updateRecurringRule(editingRule.id, {
        templateTransaction: {
          type: editForm.type,
          amount,
          accountId: editForm.accountId,
          categoryId: editForm.categoryId,
          description: editForm.description,
          tags: editForm.tagId ? [editForm.tagId] : undefined,
        },
        frequency: editForm.frequency,
        dayOfMonth,
        weekOfMonth: isMonthlyWeekPos ? (editForm.weekOfMonth as MonthlyWeekPosition) : undefined,
        dayOfWeek: isWeekly || isMonthlyWeekPos ? editForm.dayOfWeek! : undefined,
        startDate: editForm.startDate,
        nextDueDate: editForm.nextDueDate,
      });
      toast.success('Recurring rule updated');
      closeEdit();
      fetchRules();
    } catch (err) {
      console.error('Error updating recurring rule:', err);
      toast.error('Failed to update recurring rule');
    } finally {
      setSaving(false);
    }
  };

  const activeAccounts = accounts.filter((a) => a.active);
  const editCategories = editForm
    ? categories.filter((c) => c.active && c.type === (editForm.type === 'expense' ? 'expense' : 'income'))
    : [];

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading recurring rules...</p>;
  }

  if (rules.length === 0) {
    return (
      <EmptyState
        icon="🔁"
        title="No recurring transactions yet"
        description="Set up a recurring transaction from the transaction form to see it here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 ${
            !rule.isActive ? 'opacity-60' : ''
          }`}
        >
          <div className="min-w-0">
            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {rule.templateTransaction.description || 'Recurring transaction'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatCurrency(rule.templateTransaction.amount)} · {capitalize(rule.frequency)}
              {(rule.frequency === 'monthly' || rule.frequency === 'yearly') && rule.dayOfMonth
                ? ` (day ${rule.dayOfMonth})`
                : ''}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Next due {new Date(rule.nextDueDate).toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleToggleActive(rule)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                rule.isActive ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={rule.isActive ? 'Deactivate' : 'Activate'}
              title={rule.isActive ? 'Deactivate' : 'Activate'}
            >
              <span
                className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  rule.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            <button
              onClick={() => openEdit(rule)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit"
            >
              <HiPencil className="w-3.5 h-3.5 text-gray-400" />
            </button>

            <button
              onClick={() => setDeleteTarget(rule.id)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <HiTrash className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete recurring rule"
        message="This will permanently delete the recurring rule. Transactions already created from it will not be affected."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />

      {editingRule && editForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit recurring rule</h2>
              <button onClick={closeEdit} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <HiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, type: e.target.value as TransactionType, categoryId: '' })
                  }
                  className="form-input"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div>
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Account</label>
                <select
                  value={editForm.accountId}
                  onChange={(e) => setEditForm({ ...editForm, accountId: e.target.value })}
                  className="form-input"
                >
                  <option value="">Select account</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {editForm.type !== 'transfer' && (
                <div>
                  <label className="form-label">Category</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                    className="form-input"
                  >
                    <option value="">— Uncategorized —</option>
                    {editCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon || '📌'} {cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label">Description</label>
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="form-input"
                  placeholder="Add a description..."
                />
              </div>

              <div>
                <label className="form-label">Tag <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={editForm.tagId}
                  onChange={(e) => setEditForm({ ...editForm, tagId: e.target.value })}
                  className="form-input"
                >
                  <option value="">No tag</option>
                  {allTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Frequency</label>
                <select
                  value={editForm.frequency}
                  onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value as RecurringFrequency })}
                  className="form-input"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {editForm.frequency === 'yearly' && (
                <div>
                  <label className="form-label">Day of month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.dayOfMonth}
                    onChange={(e) => setEditForm({ ...editForm, dayOfMonth: e.target.value })}
                    className="form-input"
                  />
                </div>
              )}

              {editForm.frequency === 'monthly' && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {(['specific-day', 'week-position'] as const).map((mode) => (
                      <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={monthlySubMode === mode}
                          onChange={() => {
                            setMonthlySubMode(mode);
                            if (mode === 'week-position' && !editForm.weekOfMonth) {
                              setEditForm({ ...editForm, weekOfMonth: 'first' });
                            }
                          }}
                          className="w-3.5 h-3.5 text-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {mode === 'specific-day' ? 'Specific day' : 'Week position'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {monthlySubMode === 'specific-day' ? (
                    <div>
                      <label className="form-label">Day of month</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={editForm.dayOfMonth}
                        onChange={(e) => setEditForm({ ...editForm, dayOfMonth: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="form-label">Week</label>
                        <select
                          value={editForm.weekOfMonth || 'first'}
                          onChange={(e) => setEditForm({ ...editForm, weekOfMonth: e.target.value as MonthlyWeekPosition })}
                          className="form-input"
                        >
                          {WEEK_POSITION_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Day of week</label>
                        <div className="grid grid-cols-7 gap-1">
                          {WEEKDAY_LABELS.map((label, dayIndex) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, dayOfWeek: dayIndex })}
                              className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                                editForm.dayOfWeek === dayIndex
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {editForm.frequency === 'weekly' && (
                <div>
                  <label className="form-label">Day of week</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map((label, dayIndex) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, dayOfWeek: dayIndex })}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                          editForm.dayOfWeek === dayIndex
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Start date</label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Next due date</label>
                <input
                  type="date"
                  value={editForm.nextDueDate}
                  onChange={(e) => setEditForm({ ...editForm, nextDueDate: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeEdit} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringRulesList;
