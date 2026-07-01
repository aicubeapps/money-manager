import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/format';

interface MonthlyTrendChartProps {
  data: { month: string; income: number; expense: number }[];
}

const MonthlyTrendChart = ({ data }: MonthlyTrendChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `₹${value/1000}K`} />
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
        <Line type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2} />
        <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MonthlyTrendChart;