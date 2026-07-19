import { useState } from 'react';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { HiTrendingUp, HiTrendingDown, HiMinus } from 'react-icons/hi';
import { useTheme } from '../../hooks/useTheme';
import FilteredTransactionView, { type TransactionFilterDescriptor } from '../common/FilteredTransactionView';
import type { Account } from '../../types';

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
  /** Needed to resolve which accountIds make up the "asset" group for the
   * Net Worth card drill-down (accountGroup === 'asset'). */
  accounts: Account[];
}

const SummaryCards = ({
  netWorth,
  monthlyIncome,
  monthlyExpense,
  monthlySavings,
  previousPeriodChange,
  accounts,
}: SummaryCardsProps) => {
  const formatCurrency = useFormatCurrency();
  const { theme } = useTheme();
  const [drillDown, setDrillDown] = useState<{ title: string; filter: TransactionFilterDescriptor; mode?: 'transactions' | 'accounts' } | null>(null);
  const assetAccountIds = accounts.filter((a) => a.accountGroup === 'asset').map((a) => a.id);

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
      cpLabel: 'NET_WORTH',
      cpTag: 'RUNNING_TOTAL',
      value: netWorth,
      color: 'text-gray-900 dark:text-white',
      bg: 'from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20',
      badge: null,
      icon: '🏦',
      cpColor: '#00FF41',
      // Net Worth is the sum of asset-group accounts — show that group's
      // accounts first (tapping one drills into its transactions), rather
      // than jumping straight to a combined transaction list.
      onClick: assetAccountIds.length > 0
        ? () => setDrillDown({
            title: 'Net Worth · Accounts',
            filter: { kind: 'accountGroup', accountIds: assetAccountIds },
            mode: 'accounts',
          })
        : undefined,
    },
    {
      label: 'Income',
      cpLabel: 'INCOME',
      cpTag: 'PERIOD_INCOME',
      value: monthlyIncome,
      color: 'text-green-700 dark:text-green-400',
      bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      badge: getChangeBadge(previousPeriodChange.income),
      icon: '💰',
      cpColor: '#00FF41',
      onClick: undefined,
    },
    {
      label: 'Expenses',
      cpLabel: 'EXPENSES',
      cpTag: 'PERIOD_SPEND',
      value: monthlyExpense,
      color: 'text-red-700 dark:text-red-400',
      bg: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      badge: getChangeBadge(previousPeriodChange.expense, true),
      icon: '💳',
      cpColor: '#FF0040',
      onClick: undefined,
    },
    {
      label: 'Savings',
      cpLabel: 'SAVINGS',
      cpTag: 'NET_SAVED',
      value: monthlySavings,
      color: monthlySavings >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400',
      bg: 'from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20',
      badge: getChangeBadge(previousPeriodChange.savings),
      icon: '🎯',
      cpColor: monthlySavings >= 0 ? '#00FFFF' : '#FF0040',
      onClick: undefined,
    },
  ];

  if (theme === 'cyberpunk') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '24px',
          fontFamily: "'Courier New', Courier, monospace",
        }}
        className="lg:grid-cols-4"
      >
        {cards.map(({ cpLabel, cpTag, value, cpColor }) => (
          <div
            key={cpLabel}
            style={{
              background: '#000000',
              border: '1px solid rgba(0,255,65,0.3)',
              padding: '12px',
            }}
          >
            <div style={{ color: '#008F11', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '4px' }}>
              [{cpLabel}]
            </div>
            <div style={{ color: cpColor, fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.04em', marginBottom: '6px' }}>
              {formatCurrency(value)}
            </div>
            <div style={{ color: '#00CC33', fontSize: '10px', letterSpacing: '0.06em', border: '1px solid rgba(0,255,65,0.2)', display: 'inline-block', padding: '1px 6px' }}>
              {cpTag}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map(({ label, value, color, bg, badge, icon, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className={`card p-4 bg-gradient-to-br ${bg} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          >
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

      {drillDown && (
        <FilteredTransactionView
          isOpen
          title={drillDown.title}
          filter={drillDown.filter}
          mode={drillDown.mode}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
};

export default SummaryCards;
