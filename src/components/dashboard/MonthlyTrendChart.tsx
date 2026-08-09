import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

interface MonthlyTrendChartProps {
  data: { month: string; income: number; expense: number }[];
}

const MonthlyTrendChart = ({ data }: MonthlyTrendChartProps) => {
  const formatCurrency = useFormatCurrency();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={data.length > 4 ? 340 : 300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
        <Bar dataKey="income" fill="#22C55E" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
        {data.length > 4 && (
          <Brush dataKey="month" height={24} travellerWidth={8} stroke="#6366F1" fill="#94a3b833" />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyTrendChart;