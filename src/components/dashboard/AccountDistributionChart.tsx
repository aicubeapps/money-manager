import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

interface AccountDistributionChartProps {
  data: { name: string; value: number; color: string }[];
}

const COLORS = ['#3B82F6', '#22C55E', '#8B5CF6', '#EAB308', '#6366F1', '#EF4444', '#14B8A6'];

const AccountDistributionChart = ({ data }: AccountDistributionChartProps) => {
  const formatCurrency = useFormatCurrency();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No accounts
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  return (
    <div className="px-2">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            labelLine={false}
            outerRadius={90}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={{ fontSize: '0.75rem' }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: '0.72rem', paddingTop: '8px', lineHeight: '1.6' }}
            formatter={(value: string) =>
              value.length > 14 ? value.slice(0, 13) + '…' : value
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AccountDistributionChart;
