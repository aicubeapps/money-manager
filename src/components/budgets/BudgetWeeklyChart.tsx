import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { getWeeklyCategorySpend } from '../../utils/budgetSpend';
import type { Budget, Category, Tag, Transaction } from '../../types';

interface BudgetWeeklyChartProps {
  budget: Budget;
  categories: Category[];
  transactions: Transaction[];
  tags: Tag[];
}

// Same fallback palette AccountDistributionChart/ExpenseByCategoryChart-style
// components use when a category has no color of its own set.
const FALLBACK_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

const BudgetWeeklyChart = ({ budget, categories, transactions, tags }: BudgetWeeklyChartProps) => {
  const formatCurrency = useFormatCurrency();

  if (budget.allocations.length === 0) return null;

  const data = getWeeklyCategorySpend(budget, transactions, tags);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="weekLabel" />
        <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
        {budget.allocations.map((allocation, index) => {
          const category = categories.find((c) => c.id === allocation.categoryId);
          return (
            <Bar
              key={allocation.categoryId}
              dataKey={allocation.categoryId}
              name={category?.name || 'Unknown'}
              stackId="budget"
              fill={category?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BudgetWeeklyChart;
