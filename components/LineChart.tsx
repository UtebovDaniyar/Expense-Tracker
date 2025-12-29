import { View, Text, Dimensions } from 'react-native';
import { useMemo } from 'react';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ChartDataPoint {
  date: string;
  income: number;
  expenses: number;
}

interface LineChartProps {
  data: ChartDataPoint[];
  showIncome: boolean;
  showExpenses: boolean;
  height?: number;
}

export function LineChart({ data, showIncome, showExpenses, height = 220 }: LineChartProps) {
  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = height - 40;

  const chartData = useMemo(() => {
    const padding = { top: 10, right: 10, bottom: 30, left: 40 };
    if (data.length === 0) return null;

    // Find max value for scaling
    const allValues = data.flatMap((d) => [
      showIncome ? d.income : 0,
      showExpenses ? d.expenses : 0,
    ]);
    const maxValue = Math.max(...allValues, 100); // Minimum 100 for better scaling
    const minValue = 0;

    // Calculate points
    const pointSpacing = (chartWidth - padding.left - padding.right) / Math.max(data.length - 1, 1);

    const incomePoints = data.map((point, index) => ({
      x: padding.left + index * pointSpacing,
      y:
        chartHeight -
        padding.bottom -
        ((point.income - minValue) / (maxValue - minValue)) *
          (chartHeight - padding.top - padding.bottom),
      value: point.income,
    }));

    const expensePoints = data.map((point, index) => ({
      x: padding.left + index * pointSpacing,
      y:
        chartHeight -
        padding.bottom -
        ((point.expenses - minValue) / (maxValue - minValue)) *
          (chartHeight - padding.top - padding.bottom),
      value: point.expenses,
    }));

    // Create SVG path strings
    const createPath = (points: typeof incomePoints) => {
      if (points.length === 0) return '';

      let path = `M ${points[0].x} ${points[0].y}`;

      // Use quadratic curves for smooth lines
      for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currentPoint = points[i];
        const midX = (prevPoint.x + currentPoint.x) / 2;

        path += ` Q ${prevPoint.x} ${prevPoint.y}, ${midX} ${(prevPoint.y + currentPoint.y) / 2}`;
        path += ` Q ${currentPoint.x} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`;
      }

      return path;
    };

    return {
      incomePoints,
      expensePoints,
      incomePath: createPath(incomePoints),
      expensePath: createPath(expensePoints),
      maxValue,
      minValue,
      padding,
    };
  }, [data, showIncome, showExpenses, chartWidth, chartHeight]);

  if (!chartData || data.length === 0) {
    return (
      <View
        className="items-center justify-center rounded-2xl p-8"
        style={{ backgroundColor: '#e8f5e9', height }}>
        <Text className="mb-2 text-4xl">📈</Text>
        <Text className="mb-1 text-center text-base font-semibold" style={{ color: '#1a3d3d' }}>
          No data available
        </Text>
        <Text className="text-center text-sm text-gray-600">
          Add transactions to see spending trends
        </Text>
      </View>
    );
  }

  // Y-axis labels
  const yAxisLabels = [0, 25, 50, 75, 100].map((percent) => {
    const value = chartData.minValue + (chartData.maxValue - chartData.minValue) * (percent / 100);
    return {
      percent,
      value: Math.round(value),
      y:
        chartHeight -
        chartData.padding.bottom -
        ((chartHeight - chartData.padding.top - chartData.padding.bottom) * percent) / 100,
    };
  });

  return (
    <View className="rounded-2xl p-4" style={{ backgroundColor: '#f5f5f5', height }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {yAxisLabels.map((label) => (
          <Line
            key={label.percent}
            x1={chartData.padding.left}
            y1={label.y}
            x2={chartWidth - chartData.padding.right}
            y2={label.y}
            stroke="#e0e0e0"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        {yAxisLabels.map((label) => (
          <SvgText
            key={label.percent}
            x={chartData.padding.left - 8}
            y={label.y + 4}
            fontSize="10"
            fill="#9ca3af"
            textAnchor="end">
            {label.value}
          </SvgText>
        ))}

        {/* Expense line and points */}
        {showExpenses && chartData.expensePoints.length > 0 && (
          <>
            <Path
              d={chartData.expensePath}
              stroke="#f44336"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartData.expensePoints.map((point, index) => (
              <Circle
                key={`expense-${index}`}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#f44336"
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </>
        )}

        {/* Income line and points */}
        {showIncome && chartData.incomePoints.length > 0 && (
          <>
            <Path
              d={chartData.incomePath}
              stroke="#4caf50"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartData.incomePoints.map((point, index) => (
              <Circle
                key={`income-${index}`}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#4caf50"
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </>
        )}

        {/* X-axis labels */}
        {data.slice(0, Math.min(5, data.length)).map((point, index) => {
          const totalPoints = data.length;
          const step = Math.max(1, Math.floor(totalPoints / 5));
          const actualIndex = index * step;

          if (actualIndex >= totalPoints) return null;

          const x =
            chartData.padding.left +
            actualIndex *
              ((chartWidth - chartData.padding.left - chartData.padding.right) /
                Math.max(totalPoints - 1, 1));

          return (
            <SvgText
              key={index}
              x={x}
              y={chartHeight - 5}
              fontSize="10"
              fill="#9ca3af"
              textAnchor="middle">
              {new Date(data[actualIndex].date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
