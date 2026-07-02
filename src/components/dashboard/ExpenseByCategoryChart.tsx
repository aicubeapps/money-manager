import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ExpenseByCategoryChartProps {
  data: { categoryId: string; name: string; value: number; color: string }[];
  onSegmentClick?: (categoryId: string) => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#6C5CE7', '#FD79A8', '#00B894', '#FDCB6E', '#74B9FF', '#A29BFE', '#E17055', '#636E72'];

const ExpenseByCategoryChart = ({ data, onSegmentClick }: ExpenseByCategoryChartProps) => {
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
          onClick={onSegmentClick ? (entry: { payload?: { categoryId?: string } }) => {
            const categoryId = entry.payload?.categoryId;
            if (categoryId) onSegmentClick(categoryId);
          } : undefined}
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
