import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/models';
import { useFilterStore, useSettingsStore } from '@/store';

export default function TransactionFiltersModal() {
  const router = useRouter();
  const { activeFilters, setFilters, clearFilters, applyPredefinedPeriod } = useFilterStore();
  const { settings } = useSettingsStore();

  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    activeFilters.categories || []
  );
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [minAmount, setMinAmount] = useState<string>(
    activeFilters.amountRange?.min?.toString() || ''
  );
  const [maxAmount, setMaxAmount] = useState<string>(
    activeFilters.amountRange?.max?.toString() || ''
  );

  const toggleCategory = (categoryId: Category) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleApply = () => {
    // Parse amount values
    const min = minAmount ? parseFloat(minAmount) : undefined;
    const max = maxAmount ? parseFloat(maxAmount) : undefined;

    // Build filter object
    const newFilters = {
      ...activeFilters,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      amountRange: min !== undefined || max !== undefined ? { min, max } : undefined,
    };

    // Apply filters
    setFilters(newFilters);

    router.back();
  };

  const handleClearAll = () => {
    setSelectedCategories([]);
    setDateRange('month');
    setMinAmount('');
    setMaxAmount('');
    clearFilters();
  };

  // Apply predefined date range when changed
  useEffect(() => {
    if (dateRange !== 'custom') {
      applyPredefinedPeriod(dateRange);
    }
  }, [dateRange]);

  return (
    <View className="flex-1 bg-white">
      {/* Drag Handle */}
      <View className="items-center py-3">
        <View className="h-1 w-10 rounded-full bg-gray-300" />
      </View>

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4">
        <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
          Filters
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-lg text-gray-500">✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Date Range */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: '#1a3d3d' }}>
            Date Range
          </Text>
          <View className="flex-row flex-wrap">
            {(['week', 'month', 'year', 'custom'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                className="mb-3 mr-3 rounded-full px-6 py-3"
                style={{
                  backgroundColor: dateRange === range ? '#1a3d3d' : '#e8f5e9',
                }}
                onPress={() => setDateRange(range)}>
                <Text
                  className="text-sm font-semibold capitalize"
                  style={{ color: dateRange === range ? 'white' : '#1a3d3d' }}>
                  {range === 'week'
                    ? 'This Week'
                    : range === 'month'
                      ? 'This Month'
                      : range === 'year'
                        ? 'This Year'
                        : 'Custom'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: '#1a3d3d' }}>
            Categories
          </Text>
          <View className="flex-row flex-wrap">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  className="mb-3 mr-3 items-center rounded-2xl p-3"
                  style={{
                    backgroundColor: isSelected ? category.color + '40' : '#f5f5f5',
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: category.color,
                    minWidth: 80,
                  }}
                  onPress={() => toggleCategory(category.id)}>
                  <Text className="mb-1 text-2xl">{category.icon}</Text>
                  <Text className="text-xs font-semibold text-gray-800">{category.name}</Text>
                  {isSelected && (
                    <View
                      className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: category.color }}>
                      <Text className="text-xs text-white">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Amount Range */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-semibold" style={{ color: '#1a3d3d' }}>
            Amount Range
          </Text>
          <View className="flex-row items-center">
            <View className="mr-3 flex-1">
              <Text className="mb-2 text-xs text-gray-600">Minimum</Text>
              <View className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3">
                <Text className="mr-2 text-gray-600">{settings.currencySymbol}</Text>
                <TextInput
                  className="flex-1 text-base"
                  placeholder="0"
                  value={minAmount}
                  onChangeText={setMinAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-xs text-gray-600">Maximum</Text>
              <View className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3">
                <Text className="mr-2 text-gray-600">{settings.currencySymbol}</Text>
                <TextInput
                  className="flex-1 text-base"
                  placeholder="∞"
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="border-t border-gray-200 px-6 py-4">
        <View className="mb-3 flex-row">
          <TouchableOpacity
            className="mr-2 flex-1 items-center rounded-full py-4"
            style={{ backgroundColor: '#e8f5e9' }}
            onPress={handleClearAll}>
            <Text className="font-semibold" style={{ color: '#1a3d3d' }}>
              Clear All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center rounded-full py-4"
            style={{ backgroundColor: '#1a3d3d' }}
            onPress={handleApply}>
            <Text className="font-semibold text-white">Apply Filters</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-center text-xs text-gray-500">
          {(() => {
            const filters = [];
            if (selectedCategories.length > 0) {
              filters.push(
                `${selectedCategories.length} ${selectedCategories.length === 1 ? 'category' : 'categories'}`
              );
            }
            if (minAmount || maxAmount) {
              filters.push('amount range');
            }
            return filters.length > 0 ? filters.join(', ') + ' selected' : 'No filters applied';
          })()}
        </Text>
      </View>
    </View>
  );
}
