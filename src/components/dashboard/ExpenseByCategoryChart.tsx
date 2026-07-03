import { useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ExpenseByCategoryChartProps {
  data: { categoryId: string; name: string; value: number; color: string }[];
  onSegmentClick?: (categoryId: string) => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#6C5CE7', '#FD79A8', '#00B894', '#FDCB6E', '#74B9FF', '#A29BFE', '#E17055', '#636E72'];

// Recharts (3.8.1) already shows tooltips on a stationary tap via its own
// touch handling plus the browser's synthetic mouse events — verified
// empirically, no extra wiring needed for that. The remaining issue is
// specific to THIS chart: a tap ALSO fires Pie's onClick (drill-down)
// simultaneously with the tooltip, so on touch the user never actually sees
// the tooltip before the drill-down modal covers it. Fix: on touch-capable
// devices, the first tap on a segment only shows the tooltip; a second tap
// on the SAME segment within this window confirms the drill-down. Desktop
// mouse clicks are unaffected (single click still drills down immediately),
// since there's no tooltip-vs-click race for hover-capable pointers.
const CONFIRM_TAP_WINDOW_MS = 1200;
const isTouchCapable = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const ExpenseByCategoryChart = ({ data, onSegmentClick }: ExpenseByCategoryChartProps) => {
  const pendingTap = useRef<{ categoryId: string; time: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No expense data for this period
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const handleSegmentClick = (entry: { payload?: { categoryId?: string } }) => {
    const categoryId = entry.payload?.categoryId;
    if (!categoryId || !onSegmentClick) return;

    if (!isTouchCapable()) {
      onSegmentClick(categoryId);
      return;
    }

    const now = Date.now();
    const pending = pendingTap.current;
    if (pending && pending.categoryId === categoryId && now - pending.time < CONFIRM_TAP_WINDOW_MS) {
      pendingTap.current = null;
      onSegmentClick(categoryId);
    } else {
      // First tap: let the tooltip show (already happens via Recharts'
      // touch handling); wait for a confirming second tap.
      pendingTap.current = { categoryId, time: now };
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          onClick={onSegmentClick ? handleSegmentClick : undefined}
          cursor={onSegmentClick ? 'pointer' : undefined}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `₹${Number(value ?? 0).toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpenseByCategoryChart;
