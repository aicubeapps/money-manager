import { useState } from 'react';
import { formatCurrency } from '../../utils/format';

interface ExpenseByCategoryChartProps {
  data: { name: string; value: number; color: string; icon?: string }[];
  onSelectCategory?: (name: string) => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#6C5CE7', '#FD79A8', '#00B894', '#FDCB6E', '#74B9FF', '#A29BFE', '#E17055', '#636E72'];

const VISIBLE_COUNT = 6;

const ExpenseByCategoryChart = ({ data, onSelectCategory }: ExpenseByCategoryChartProps) => {
  const [showAll, setShowAll] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No expense data for this period
      </div>
    );
  }

  const chartData = [...data]
    .map((item, index) => ({
      ...item,
      color: item.color || COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const rows = showAll ? chartData : chartData.slice(0, VISIBLE_COUNT);

  return (
    <div className="space-y-2.5">
      {rows.map((item) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelectCategory?.(item.name)}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="flex items-center gap-1.5 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.name}</span>
              </span>
              <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatCurrency(item.value)} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
          </button>
        );
      })}

      {chartData.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline mt-1"
        >
          {showAll ? 'Show less' : `Show all ${chartData.length} categories`}
        </button>
      )}
    </div>
  );
};

export default ExpenseByCategoryChart;
