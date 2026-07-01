import { formatCurrency } from '../../utils/format';
import { HiTrendingUp, HiTrendingDown, HiMinus } from 'react-icons/hi';

interface SummaryCardsProps {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  previousPeriodChange: {
    income: number;
    expense: number;
    savings: number;
  };
}

const SummaryCards = ({
  netWorth,
  monthlyIncome,
  monthlyExpense,
  monthlySavings,
  previousPeriodChange,
}: SummaryCardsProps) => {
  const getChangeBadge = (change: number, invertColor = false) => {
    if (change === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-full">
          <HiMinus className="w-3 h-3" /> No change
        </span>
      );
    }
    const isPositive = change > 0;
    const isGood = invertColor ? !isPositive : isPositive;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        isGood
          ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
          : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      }`}>
        {isPositive ? <HiTrendingUp className="w-3 h-3" /> : <HiTrendingDown className="w-3 h-3" />}
        {formatCurrency(Math.abs(change))}
      </span>
    );
  };

  const cards = [
    {
      label: 'Net Worth',
      value: netWorth,
      color: 'text-gray-900 dark:text-white',
      bg: 'from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20',
      badge: null,
      icon: '🏦',
    },
    {
      label: 'Income',
      value: monthlyIncome,
      color: 'text-green-700 dark:text-green-400',
      bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      badge: getChangeBadge(previousPeriodChange.income),
      icon: '💰',
    },
    {
      label: 'Expenses',
      value: monthlyExpense,
      color: 'text-red-700 dark:text-red-400',
      bg: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      badge: getChangeBadge(previousPeriodChange.expense, true),
      icon: '💳',
    },
    {
      label: 'Savings',
      value: monthlySavings,
      color: monthlySavings >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400',
      bg: 'from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20',
      badge: getChangeBadge(previousPeriodChange.savings),
      icon: '🎯',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, color, bg, badge, icon }) => (
        <div key={label} className={`card p-4 bg-gradient-to-br ${bg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-lg">{icon}</span>
          </div>
          <div className={`text-xl font-bold ${color} mb-2 truncate`}>
            {formatCurrency(value)}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
