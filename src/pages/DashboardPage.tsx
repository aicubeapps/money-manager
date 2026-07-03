import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAccounts } from '../hooks/useAccounts';
import SummaryCards from '../components/dashboard/SummaryCards';
import BudgetBurnRateCard from '../components/dashboard/BudgetBurnRateCard';
import ExpenseByCategoryChart from '../components/dashboard/ExpenseByCategoryChart';
import MonthlyTrendChart from '../components/dashboard/MonthlyTrendChart';
import AccountDistributionChart from '../components/dashboard/AccountDistributionChart';
import FilteredTransactionView, { type TransactionFilterDescriptor } from '../components/common/FilteredTransactionView';
import { formatDateRange, getDateRange } from '../utils/dateUtils';
import type { TimeView } from '../utils/dateUtils';
import Skeleton from '../components/common/Skeleton';
import PullToRefresh from '../components/common/PullToRefresh';
import { useAuth } from '../hooks/useAuth';

const TIME_VIEWS: { value: TimeView; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="flex items-start justify-between gap-4">
      <div>
        <Skeleton width={220} height={28} className="mb-2" />
        <Skeleton width={140} height={16} />
      </div>
      <Skeleton width={260} height={36} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={92} />)}
    </div>
    <Skeleton height={100} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Skeleton height={340} />
      <Skeleton height={340} />
      <div className="lg:col-span-2">
        <Skeleton height={300} />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [view, setView] = useState<TimeView>('month');
  const [refreshKey, setRefreshKey] = useState(0);
  const { userData } = useAuth();
  const { accounts } = useAccounts(refreshKey);
  const [drillDown, setDrillDown] = useState<{ title: string; filter: TransactionFilterDescriptor } | null>(null);
  const {
    netWorth,
    monthlyIncome,
    monthlyExpense,
    monthlySavings,
    expenseByCategory,
    monthlyTrend,
    accountDistribution,
    previousPeriodChange,
    budgetBurnRate,
    loading,
    error,
  } = useDashboardData(view, refreshKey);

  const now = new Date();
  const { start, end } = getDateRange(view, now);

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
    await new Promise((resolve) => setTimeout(resolve, 400));
  };

  if (loading) return <DashboardSkeleton />;

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
    <PullToRefresh onRefresh={handleRefresh}>
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
        accounts={accounts}
      />

      <BudgetBurnRateCard burnRate={budgetBurnRate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Expense by Category</h3>
          <ExpenseByCategoryChart
            data={expenseByCategory}
            onSegmentClick={(categoryId) => {
              const category = expenseByCategory.find((c) => c.categoryId === categoryId);
              setDrillDown({
                title: `${category?.name || 'Category'} · ${formatDateRange(start, end)}`,
                filter: { kind: 'category', categoryId, startDate: start, endDate: end },
              });
            }}
          />
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

      {drillDown && (
        <FilteredTransactionView
          isOpen
          title={drillDown.title}
          filter={drillDown.filter}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
    </PullToRefresh>
  );
};

export default DashboardPage;
