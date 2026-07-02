import type { Budget, Tag, Transaction } from '../types';
import { getCategorySpend, isExcludedFromBudget } from './budgetSpend';

// ---------------------------------------------------------------------------
// Background insight counters for budgets. No UI consumes these yet.
//
// Approach: fully derived on read from transactions + budgets, not
// incrementally written/stored. For this app's data volume (a single user's
// transactions/budgets, realistically low thousands of rows) recomputing on
// demand is cheap and avoids the correctness risk of keeping incremental
// counters in sync with edits/deletes to historical transactions and
// budgets. If this ever needs to run over a much larger dataset (e.g. an
// admin view across many users), switch to incremental counters written
// alongside budget/transaction writes instead.
// ---------------------------------------------------------------------------

export interface CategoryOvershoot {
  categoryId: string;
  month: number;
  year: number;
  spent: number;
  allocated: number;
  overshootAmount: number;
}

export interface BudgetInsights {
  /** (a) Lifetime count of month/category combos that went over their allocation. */
  totalOvershootCount: number;
  /** (b) Current consecutive-month overshoot streak, per categoryId. A category's
   * streak counts back from the most recent budgeted month it appears in; a gap
   * (a budgeted month where that category wasn't overshot, or wasn't allocated
   * at all) resets it to 0. */
  consecutiveOvershootStreakByCategory: Record<string, number>;
  /** (c) Count of months overshot, per categoryId (lifetime, not just current streak). */
  overshootFrequencyByCategory: Record<string, number>;
  /** (d) The single largest month/category overshoot on record, or null if none. */
  largestOvershoot: CategoryOvershoot | null;
  /** (e) Average day-of-month (1-31) on which a category's spend first crossed
   * its allocation, averaged across all categories/months that were ever overshot.
   * Null if no overshoot has a determinable crossing date. */
  averageOvershootDayOfMonth: number | null;
  /** (f) Sum of budget-excluded transaction amounts, keyed by "year-month" (e.g. "2026-7"). */
  excludedSpendByMonth: Record<string, number>;
}

const monthKey = (month: number, year: number) => `${year}-${month}`;

/**
 * Finds the day-of-month on which a category's cumulative expense spend
 * first exceeded its allocation within a given month/year. Returns null if
 * spend never crosses the allocation (shouldn't be called otherwise) or
 * there are no matching transactions.
 */
const findOvershootDay = (
  transactions: Transaction[],
  tags: Tag[],
  categoryId: string,
  month: number,
  year: number,
  allocated: number
): number | null => {
  const dayTxs = transactions
    .filter((t) => t.type === 'expense' && t.categoryId === categoryId)
    .filter((t) => !isExcludedFromBudget(t, tags))
    .filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0;
  for (const t of dayTxs) {
    running += t.amount;
    if (running > allocated) {
      return new Date(t.date).getDate();
    }
  }
  return null;
};

export const computeBudgetInsights = (
  budgets: Budget[],
  transactions: Transaction[],
  tags: Tag[]
): BudgetInsights => {
  // Chronological order matters for the streak calculation.
  const orderedBudgets = [...budgets].sort((a, b) => a.year - b.year || a.month - b.month);

  const overshoots: CategoryOvershoot[] = [];
  const overshootFrequencyByCategory: Record<string, number> = {};
  const overshootDaysOfMonth: number[] = [];

  for (const budget of orderedBudgets) {
    for (const allocation of budget.allocations) {
      const spent = getCategorySpend(transactions, tags, allocation.categoryId, budget.month, budget.year);
      if (spent > allocation.amount) {
        const overshootAmount = spent - allocation.amount;
        overshoots.push({
          categoryId: allocation.categoryId,
          month: budget.month,
          year: budget.year,
          spent,
          allocated: allocation.amount,
          overshootAmount,
        });
        overshootFrequencyByCategory[allocation.categoryId] =
          (overshootFrequencyByCategory[allocation.categoryId] || 0) + 1;

        const day = findOvershootDay(transactions, tags, allocation.categoryId, budget.month, budget.year, allocation.amount);
        if (day !== null) overshootDaysOfMonth.push(day);
      }
    }
  }

  // Consecutive-month streak per category: walk each category's budgeted
  // months in chronological order, counting back from the most recent one.
  const categoryIds = new Set(orderedBudgets.flatMap((b) => b.allocations.map((a) => a.categoryId)));
  const consecutiveOvershootStreakByCategory: Record<string, number> = {};
  for (const categoryId of categoryIds) {
    const monthsForCategory = orderedBudgets
      .filter((b) => b.allocations.some((a) => a.categoryId === categoryId))
      .map((b) => {
        const allocation = b.allocations.find((a) => a.categoryId === categoryId)!;
        const spent = getCategorySpend(transactions, tags, categoryId, b.month, b.year);
        return spent > allocation.amount;
      });

    let streak = 0;
    for (let i = monthsForCategory.length - 1; i >= 0; i--) {
      if (monthsForCategory[i]) streak += 1;
      else break;
    }
    consecutiveOvershootStreakByCategory[categoryId] = streak;
  }

  const largestOvershoot = overshoots.length
    ? overshoots.reduce((max, o) => (o.overshootAmount > max.overshootAmount ? o : max))
    : null;

  const averageOvershootDayOfMonth = overshootDaysOfMonth.length
    ? overshootDaysOfMonth.reduce((sum, d) => sum + d, 0) / overshootDaysOfMonth.length
    : null;

  const excludedSpendByMonth: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (!isExcludedFromBudget(t, tags)) continue;
    const d = new Date(t.date);
    const key = monthKey(d.getMonth() + 1, d.getFullYear());
    excludedSpendByMonth[key] = (excludedSpendByMonth[key] || 0) + t.amount;
  }

  return {
    totalOvershootCount: overshoots.length,
    consecutiveOvershootStreakByCategory,
    overshootFrequencyByCategory,
    largestOvershoot,
    averageOvershootDayOfMonth,
    excludedSpendByMonth,
  };
};
