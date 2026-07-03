import { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

interface ExpenseByCategoryChartProps {
  data: { categoryId: string; name: string; icon: string; value: number; color: string }[];
  onSegmentClick?: (categoryId: string) => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#6C5CE7', '#FD79A8', '#00B894', '#FDCB6E', '#74B9FF', '#A29BFE', '#E17055', '#636E72'];
const COLLAPSED_LIMIT = 6;

// Was a Recharts Pie chart with a custom legend — on mobile the legend
// labels overlapped the slice emoji/percentage labels and wrapped badly
// (confirmed via screenshot). A horizontal bar list avoids that whole class
// of layout problem: no absolute-positioned labels fighting for space, and
// every row's text has a full-width line to itself.
const ExpenseByCategoryChart = ({ data, onSegmentClick }: ExpenseByCategoryChartProps) => {
  const formatCurrency = useFormatCurrency();
  const [showAll, setShowAll] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No expense data for this period
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  const visible = showAll ? sorted : sorted.slice(0, COLLAPSED_LIMIT);
  const hasMore = sorted.length > COLLAPSED_LIMIT;

  return (
    <div className="space-y-3">
      {visible.map((item, index) => {
        const color = item.color || COLORS[index % COLORS.length];
        const percent = total > 0 ? (item.value / total) * 100 : 0;

        return (
          <div
            key={item.categoryId}
            onClick={onSegmentClick ? () => onSegmentClick(item.categoryId) : undefined}
            role={onSegmentClick ? 'button' : undefined}
            tabIndex={onSegmentClick ? 0 : undefined}
            className={`py-1 ${onSegmentClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 min-w-0">
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 w-9 text-right flex-shrink-0">
                {percent.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline pt-1"
        >
          {showAll ? (
            <>Show less <HiChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Show all {sorted.length} categories <HiChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
};

export default ExpenseByCategoryChart;
