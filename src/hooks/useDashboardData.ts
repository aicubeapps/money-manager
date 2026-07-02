import { useMemo } from 'react';
import { useAccounts } from './useAccounts';
import { useTransactions } from './useTransactions';
import { useCategories } from './useCategories';
import { useBudgets } from './useBudgets';
import { useTags } from './useTags';
import { getDateRange, getPreviousPeriod } from '../utils/dateUtils';
import { calculateAccountBalance } from '../utils/accountBalance';
import { isExcludedFromBudget } from '../utils/budgetSpend';
import type { TimeView } from '../utils/dateUtils';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  subDays, subWeeks, subMonths,
  format,
} from 'date-fns';

export interface BudgetBurnRate {
  hasBudget: boolean;
  overallBudget: number;
  spentSoFar: number;
  remainingBudget: number;
  avgDailySpend: number;
  /** Estimated days the remaining budget will last at the current daily burn rate.
   * Null when there's no spend yet to compute a rate from. */
  estimatedDaysLeft: number | null;
  /** Calendar days remaining in the current month (after today). */
  calendarDaysLeft: number;
}

interface DashboardData {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  expenseByCategory: { categoryId: string; name: string; value: number; color: string }[];
  monthlyTrend: { month: string; income: number; expense: number }[];
  accountDistribution: { name: string; value: number; color: string }[];
  previousPeriodChange: {
    income: number;
    expense: number;
    savings: number;
  };
  budgetBurnRate: BudgetBurnRate;
  loading: boolean;
  error: string | null;
}

const EMPTY_BURN_RATE: BudgetBurnRate = {
  hasBudget: false,
  overallBudget: 0,
  spentSoFar: 0,
  remainingBudget: 0,
  avgDailySpend: 0,
  estimatedDaysLeft: null,
  calendarDaysLeft: 0,
};

export const useDashboardData = (view: TimeView = 'month') => {
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts();
  const { transactions, loading: transactionsLoading, error: transactionsError } = useTransactions();
  const { categories, loading: categoriesLoading } = useCategories();
  const now0 = new Date();
  const { budgets: currentMonthBudgets, loading: budgetsLoading } = useBudgets(now0.getMonth() + 1, now0.getFullYear());
  const { tags, loading: tagsLoading } = useTags();

  const loading = accountsLoading || transactionsLoading || categoriesLoading || budgetsLoading || tagsLoading;
  const error = accountsError || transactionsError;

  const data = useMemo((): DashboardData => {
    if (loading || error || !accounts || !transactions || !categories) {
      return {
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
        monthlySavings: 0,
        expenseByCategory: [],
        monthlyTrend: [],
        accountDistribution: [],
        previousPeriodChange: { income: 0, expense: 0, savings: 0 },
        budgetBurnRate: EMPTY_BURN_RATE,
        loading,
        error,
      };
    }

    const now = new Date();
    const { start, end } = getDateRange(view, now);

    // Filter transactions within range
    const periodTransactions = transactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= start && txDate <= end;
    });

    // Compute totals
    let income = 0;
    let expense = 0;
    // For transfers, we consider them as moving money, not income/expense
    periodTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
      // transfers ignored for income/expense
    });

    // Net worth includes only asset accounts (savings/cash/UPI/etc.) — credit
    // accounts are liabilities and must be fully excluded, not netted against
    // anything. Uses calculateAccountBalance so it reflects real transaction
    // activity per account (income/expense/transfers), not just openingBalance.
    const netWorth = accounts
      .filter((a) => a.accountGroup === 'asset')
      .reduce((sum, a) => sum + calculateAccountBalance(a, transactions), 0);

    // Expense by category (for selected period)
    const expenseByCategoryMap = new Map<string, number>();
    periodTransactions
      .filter(t => t.type === 'expense' && t.categoryId)
      .forEach(t => {
        const catId = t.categoryId!;
        expenseByCategoryMap.set(catId, (expenseByCategoryMap.get(catId) || 0) + t.amount);
      });

    const expenseByCategory = Array.from(expenseByCategoryMap.entries()).map(([catId, value]) => {
      const category = categories.find(c => c.id === catId);
      return {
        categoryId: catId,
        name: category ? category.name : 'Unknown',
        value,
        color: category?.color || '#636E72',
      };
    }).sort((a, b) => b.value - a.value);

    // Trend data — bucket granularity and window depend on selected view
    const bucketTxs = (bucketStart: Date, bucketEnd: Date) => {
      let inc = 0, exp = 0;
      transactions.forEach((t) => {
        const d = new Date(t.date);
        if (d >= bucketStart && d <= bucketEnd) {
          if (t.type === 'income') inc += t.amount;
          else if (t.type === 'expense') exp += t.amount;
        }
      });
      return { income: inc, expense: exp };
    };

    let monthlyTrend: { month: string; income: number; expense: number }[];

    if (view === 'week') {
      // Last 14 days, daily buckets
      const days = eachDayOfInterval({ start: startOfDay(subDays(now, 13)), end: endOfDay(now) });
      monthlyTrend = days.map((day) => {
        const { income, expense } = bucketTxs(startOfDay(day), endOfDay(day));
        return { month: format(day, 'd MMM'), income, expense };
      });
    } else if (view === 'month') {
      // Last 4 weeks, weekly buckets
      const weekOpts = { weekStartsOn: 1 as const };
      const wStart = startOfWeek(subWeeks(now, 3), weekOpts);
      const weeks = eachWeekOfInterval({ start: wStart, end: endOfWeek(now, weekOpts) }, weekOpts);
      monthlyTrend = weeks.map((week) => {
        const ws = startOfWeek(week, weekOpts);
        const we = endOfWeek(week, weekOpts);
        const { income, expense } = bucketTxs(ws, we);
        return { month: format(ws, 'd MMM'), income, expense };
      });
    } else if (view === 'year') {
      // Last 24 months, monthly buckets
      const months = eachMonthOfInterval({ start: startOfMonth(subMonths(now, 23)), end: endOfMonth(now) });
      monthlyTrend = months.map((month) => {
        const { income, expense } = bucketTxs(startOfMonth(month), endOfMonth(month));
        return { month: format(month, 'MMM yy'), income, expense };
      });
    } else {
      // quarter / today / default: last 12 months, monthly buckets
      const months = eachMonthOfInterval({ start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) });
      monthlyTrend = months.map((month) => {
        const { income, expense } = bucketTxs(startOfMonth(month), endOfMonth(month));
        return { month: format(month, 'MMM yyyy'), income, expense };
      });
    }

    // Account distribution — compute current balance per account from transactions
    const typeColorMap: Record<string, string> = {
      savings: '#3B82F6',
      current: '#22C55E',
      credit: '#8B5CF6',
      cash: '#EAB308',
      upi: '#6366F1',
      loan: '#EF4444',
      investment: '#14B8A6',
    };
    const accountDistribution = accounts.map((acc) => ({
      name: acc.name,
      value: calculateAccountBalance(acc, transactions),
      color: typeColorMap[acc.type] || '#6B7280',
    }));

    // Previous period change
    const prevPeriod = getPreviousPeriod(view, now);
    const prevTxs = transactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= prevPeriod.start && txDate <= prevPeriod.end;
    });
    let prevIncome = 0, prevExpense = 0;
    prevTxs.forEach(t => {
      if (t.type === 'income') prevIncome += t.amount;
      else if (t.type === 'expense') prevExpense += t.amount;
    });
    const prevSavings = prevIncome - prevExpense;
    const currentSavings = income - expense;

    // Budget burn rate — always based on the actual current month, independent
    // of the selected dashboard `view`.
    const budgetBurnRate: BudgetBurnRate = (() => {
      const currentBudget = currentMonthBudgets[0];
      if (!currentBudget) return EMPTY_BURN_RATE;

      const monthStart = startOfMonth(now);
      const daysInMonth = endOfMonth(now).getDate();
      const currentDay = now.getDate();
      const calendarDaysLeft = Math.max(daysInMonth - currentDay, 0);

      const spentSoFar = transactions
        .filter((t) => t.type === 'expense')
        .filter((t) => {
          const d = new Date(t.date);
          return d >= monthStart && d <= now;
        })
        .filter((t) => !isExcludedFromBudget(t, tags))
        .reduce((sum, t) => sum + t.amount, 0);

      const avgDailySpend = spentSoFar / currentDay;
      const remainingBudget = currentBudget.amount - spentSoFar;
      const estimatedDaysLeft = avgDailySpend > 0 ? remainingBudget / avgDailySpend : null;

      return {
        hasBudget: true,
        overallBudget: currentBudget.amount,
        spentSoFar,
        remainingBudget,
        avgDailySpend,
        estimatedDaysLeft,
        calendarDaysLeft,
      };
    })();

    return {
      netWorth,
      monthlyIncome: income,
      monthlyExpense: expense,
      monthlySavings: currentSavings,
      expenseByCategory,
      monthlyTrend,
      budgetBurnRate,
      accountDistribution,
      previousPeriodChange: {
        income: income - prevIncome,
        expense: expense - prevExpense,
        savings: currentSavings - prevSavings,
      },
      loading: false,
      error: null,
    };
  }, [accounts, transactions, categories, currentMonthBudgets, tags, view, loading, error]);

  return data;
};
