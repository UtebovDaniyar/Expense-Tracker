import { forwardRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { CATEGORIES, getCategoryConfig } from '@/constants/categories';
import { Category } from '@/types/models';

interface CategorySelectorProps {
  label?: string;
  selectedCategory?: Category;
  onSelect: (category: Category) => void;
  errorText?: string;
  className?: string;
}

export const CategorySelector = forwardRef<View, CategorySelectorProps>(
  ({ label, selectedCategory, onSelect, errorText, className }, ref) => {
    const hasError = !!errorText;

    return (
      <View ref={ref} className={className}>
        {label && <Text className="mb-2 text-sm font-semibold text-gray-700">{label}</Text>}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
          contentContainerStyle={{ paddingRight: 16 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                className="mr-3 items-center rounded-2xl p-3"
                style={{
                  backgroundColor: isSelected ? cat.color + '40' : '#f5f5f5',
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: cat.color,
                  minWidth: 80,
                }}
                onPress={() => onSelect(cat.id)}>
                <Text className="mb-1 text-2xl">{cat.icon}</Text>
                <Text className="text-xs font-semibold text-gray-800">{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {errorText && <Text className="mt-1 text-xs text-red-500">{errorText}</Text>}
      </View>
    );
  }
);

CategorySelector.displayName = 'CategorySelector';
