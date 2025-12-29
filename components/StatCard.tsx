import { View, Text } from 'react-native';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  backgroundColor?: string;
  valueColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  backgroundColor = '#e8f5e9',
  valueColor = '#1a3d3d',
  trend,
}: StatCardProps) {
  return (
    <View className="rounded-2xl p-4" style={{ backgroundColor }}>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm text-gray-600">{title}</Text>
        {icon && <Text className="text-xl">{icon}</Text>}
      </View>

      <Text className="mb-1 text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </Text>

      {subtitle && <Text className="text-xs text-gray-600">{subtitle}</Text>}

      {trend && (
        <View className="mt-2 flex-row items-center">
          <View
            className="mr-2 rounded-full px-2 py-1"
            style={{
              backgroundColor: trend.isPositive ? '#4caf5020' : '#f4433620',
            }}>
            <Text
              className="text-xs font-semibold"
              style={{
                color: trend.isPositive ? '#4caf50' : '#f44336',
              }}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
          <Text className="text-xs text-gray-600">vs last period</Text>
        </View>
      )}
    </View>
  );
}
