import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

interface AccountDistributionChartProps {
  data: { name: string; value: number; color: string }[];
}

const COLORS = ['#3B82F6', '#22C55E', '#8B5CF6', '#EAB308', '#6366F1', '#EF4444', '#14B8A6'];

// Below these dimensions a rectangle is too small for legible text — skip the
// label entirely rather than let it overflow/overlap neighboring tiles.
const MIN_LABEL_WIDTH = 46;
const MIN_LABEL_HEIGHT = 28;
const MIN_BALANCE_LABEL_HEIGHT = 42;

interface TreemapTileProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  color?: string;
  isNegative?: boolean;
  formatCurrency: (value: number) => string;
}

const TreemapTile = ({ x = 0, y = 0, width = 0, height = 0, name = '', value = 0, color = '#6B7280', isNegative, formatCurrency }: TreemapTileProps) => {
  const canLabel = width >= MIN_LABEL_WIDTH && height >= MIN_LABEL_HEIGHT;
  // Rough char budget for the available width at this font size.
  const maxChars = Math.max(1, Math.floor(width / 6.5));
  const label = name.length > maxChars ? name.slice(0, Math.max(1, maxChars - 1)) + '…' : name;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={isNegative ? 0.4 : 0.9}
        stroke="#ffffff"
        strokeOpacity={0.6}
        strokeWidth={2}
        strokeDasharray={isNegative ? '4 3' : undefined}
      />
      {canLabel && (
        <text x={x + 6} y={y + 16} fill="#ffffff" fontSize={11} fontWeight={600} style={{ pointerEvents: 'none' }}>
          {label}
        </text>
      )}
      {canLabel && height >= MIN_BALANCE_LABEL_HEIGHT && (
        <text x={x + 6} y={y + 32} fill="#ffffff" fillOpacity={0.9} fontSize={10} style={{ pointerEvents: 'none' }}>
          {formatCurrency(value)}
        </text>
      )}
    </g>
  );
};

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
    name: item.name,
    value: item.value,
    // Treemap sizes by magnitude; a credit-card/loan's negative balance
    // still needs a positive area, distinguished visually via isNegative
    // instead (dashed border + lower opacity) rather than a separate color
    // that would clash with the existing type-color mapping.
    size: Math.abs(item.value) || 1,
    isNegative: item.value < 0,
    color: item.color || COLORS[index % COLORS.length],
  }));

  return (
    <div className="px-2">
      <ResponsiveContainer width="100%" height={260}>
        <Treemap
          data={chartData}
          dataKey="size"
          isAnimationActive={false}
          content={<TreemapTile formatCurrency={formatCurrency} />}
        >
          <Tooltip
            formatter={(_value, _name, item) => formatCurrency(item.payload.value)}
            contentStyle={{ fontSize: '0.75rem' }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
};

export default AccountDistributionChart;
