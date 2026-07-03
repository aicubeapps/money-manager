import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import type { BudgetBurnRate } from '../../hooks/useDashboardData';

interface BudgetBurnRateCardProps {
  burnRate: BudgetBurnRate;
}

const BudgetBurnRateCard = ({ burnRate }: BudgetBurnRateCardProps) => {
  const formatCurrency = useFormatCurrency();
  if (!burnRate.hasBudget) return null;

  const { spentSoFar, remainingBudget, estimatedDaysLeft, calendarDaysLeft } = burnRate;

  const isOverBudget = remainingBudget < 0;
  const noSpendYet = spentSoFar === 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Budget Pace</h3>
        <span className="text-lg">⏱️</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {isOverBudget ? 'Over budget by' : 'Remaining budget'}
          </div>
          <div className={`font-bold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(Math.abs(remainingBudget))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Est. days budget lasts</div>
          <div className="font-bold text-gray-900 dark:text-white">
            {noSpendYet
              ? '—'
              : estimatedDaysLeft === null
              ? '—'
              : `${Math.max(Math.round(estimatedDaysLeft), 0)} day${Math.round(estimatedDaysLeft) === 1 ? '' : 's'}`}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        {noSpendYet
          ? `No spend recorded yet this month. ${calendarDaysLeft} calendar day${calendarDaysLeft === 1 ? '' : 's'} left.`
          : `At the current daily pace, vs. ${calendarDaysLeft} calendar day${calendarDaysLeft === 1 ? '' : 's'} left in the month.`}
      </p>
    </div>
  );
};

export default BudgetBurnRateCard;
