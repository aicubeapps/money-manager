import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import SummaryCards from '../components/dashboard/SummaryCards';
import ExpenseByCategoryChart from '../components/dashboard/ExpenseByCategoryChart';
import MonthlyTrendChart from '../components/dashboard/MonthlyTrendChart';
import AccountDistributionChart from '../components/dashboard/AccountDistributionChart';
import { formatDateRange, getDateRange } from '../utils/dateUtils';
import type { TimeView } from '../utils/dateUtils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

const TIME_VIEWS: { value: TimeView; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const DashboardPage = () => {
  const [view, setView] = useState<TimeView>('month');
  const { userData } = useAuth();
  const {
    netWorth,
    monthlyIncome,
    monthlyExpense,
    monthlySavings,
    expenseByCategory,
    monthlyTrend,
    accountDistribution,
    previousPeriodChange,
    loading,
    error,
  } = useDashboardData(view);

  const now = new Date();
  const { start, end } = getDateRange(view, now);

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  if (error) {
    return (
      <div className="card p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-500 font-medium">Error loading dashboard</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting()}{userData?.displayName ? `, ${userData.displayName.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {formatDateRange(start, end)}
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
          {TIME_VIEWS.map(({ value: v, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all duration-150 ${
                view === v
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <SummaryCards
        netWorth={netWorth}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        monthlySavings={monthlySavings}
        previousPeriodChange={previousPeriodChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Expense by Category</h3>
          <ExpenseByCategoryChart data={expenseByCategory} />
        </div>
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Monthly Trend</h3>
          <MonthlyTrendChart data={monthlyTrend} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Account Distribution</h3>
          <AccountDistributionChart data={accountDistribution} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
