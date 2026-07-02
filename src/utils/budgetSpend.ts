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
