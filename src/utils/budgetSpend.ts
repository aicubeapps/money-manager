import type { Budget, Tag, Transaction } from '../types';

// A transaction counts against budget spend unless it carries at least one
// tag flagged excludeFromBudget. This check is shared by category spend
// totals, overshoot detection, and the insight counters in budgetInsights.ts —
// it intentionally does NOT touch Dashboard totals/net worth/charts.
export const isExcludedFromBudget = (transaction: Transaction, tags: Tag[]): boolean => {
  if (!transaction.tags || transaction.tags.length === 0) return false;
  const excludedTagIds = new Set(tags.filter((t) => t.excludeFromBudget).map((t) => t.id));
  return transaction.tags.some((tagId) => excludedTagIds.has(tagId));
};

// Sum of expense transactions for a category within a given month/year,
// skipping any transaction carrying a budget-excluded tag.
export const getCategorySpend = (
  transactions: Transaction[],
  tags: Tag[],
  categoryId: string,
  month: number,
  year: number
): number => {
  return transactions
    .filter((t) => t.type === 'expense')
    .filter((t) => t.categoryId === categoryId)
    .filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .filter((t) => !isExcludedFromBudget(t, tags))
    .reduce((sum, t) => sum + t.amount, 0);
};

// Per-category spend map for a given budget's month/year, keyed by categoryId.
// Only includes categories present in the budget's allocations.
export const getBudgetCategorySpends = (
  budget: Budget,
  transactions: Transaction[],
  tags: Tag[]
): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const allocation of budget.allocations) {
    result[allocation.categoryId] = getCategorySpend(
      transactions,
      tags,
      allocation.categoryId,
      budget.month,
      budget.year
    );
  }
  return result;
};

// Total expense spend across all categories for a given month/year, skipping
// budget-excluded-tag transactions — the single source of truth for "total
// expenditure this month" shared by the Budgets page's global progress bar
// and the dashboard's Budget Pace card, so both always show the same figure.
export const getTotalSpend = (
  transactions: Transaction[],
  tags: Tag[],
  month: number,
  year: number
): number => {
  return transactions
    .filter((t) => t.type === 'expense')
    .filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .filter((t) => !isExcludedFromBudget(t, tags))
    .reduce((sum, t) => sum + t.amount, 0);
};

const WEEKS_PER_MONTH = 4;

export interface WeeklyCategorySpend {
  weekLabel: string;
  /** categoryId -> amount spent in that category during this week. */
  [categoryId: string]: number | string;
}

// Buckets each budgeted category's spend into 4 week-of-month buckets (days
// 1-7, 8-14, 15-21, 22-end — the last bucket absorbs the extra 1-3 days a
// 29/30/31-day month has beyond 28), for the weekly stacked bar chart. Only
// categories present in the budget's allocations are included, matching the
// category-progress-bars section directly above it.
export const getWeeklyCategorySpend = (
  budget: Budget,
  transactions: Transaction[],
  tags: Tag[]
): WeeklyCategorySpend[] => {
  const categoryIds = new Set(budget.allocations.map((a) => a.categoryId));
  const buckets: WeeklyCategorySpend[] = Array.from({ length: WEEKS_PER_MONTH }, (_, i) => ({
    weekLabel: `Week ${i + 1}`,
  }));

  transactions
    .filter((t) => t.type === 'expense' && t.categoryId && categoryIds.has(t.categoryId))
    .filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === budget.month && d.getFullYear() === budget.year;
    })
    .filter((t) => !isExcludedFromBudget(t, tags))
    .forEach((t) => {
      const dayOfMonth = new Date(t.date).getDate();
      const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), WEEKS_PER_MONTH - 1);
      const bucket = buckets[weekIndex];
      const categoryId = t.categoryId!;
      bucket[categoryId] = (Number(bucket[categoryId]) || 0) + t.amount;
    });

  return buckets;
};

// Spend per unbudgeted category for a given month/year. Groups expense
// transactions by categoryId, skipping any category present in
// budgetedCategoryIds and any transaction excluded via budget-excluded tags.
// Returns entries sorted by spend descending.
export const getUnaccountedSpend = (
  transactions: Transaction[],
  tags: Tag[],
  budgetedCategoryIds: Set<string>,
  month: number,
  year: number
): { categoryId: string; spent: number }[] => {
  const spendMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense' && t.categoryId && !budgetedCategoryIds.has(t.categoryId))
    .filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .filter((t) => !isExcludedFromBudget(t, tags))
    .forEach((t) => {
      const id = t.categoryId!;
      spendMap[id] = (spendMap[id] || 0) + t.amount;
    });
  return Object.entries(spendMap)
    .map(([categoryId, spent]) => ({ categoryId, spent }))
    .sort((a, b) => b.spent - a.spent);
};

// True if a category's spend exceeds its allocated amount for a budget.
export const isCategoryOvershot = (
  budget: Budget,
  categoryId: string,
  transactions: Transaction[],
  tags: Tag[]
): boolean => {
  const allocation = budget.allocations.find((a) => a.categoryId === categoryId);
  if (!allocation) return false;
  return getCategorySpend(transactions, tags, categoryId, budget.month, budget.year) > allocation.amount;
};
