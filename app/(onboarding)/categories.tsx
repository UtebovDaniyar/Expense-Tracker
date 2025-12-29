import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSettingsStore } from '@/store';
import { CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/models';

export default function CategoriesPreferenceScreen() {
  const router = useRouter();
  const { updateSettings, completeOnboarding } = useSettingsStore();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const toggleCategory = (categoryId: Category) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleFinish = async () => {
    await updateSettings({ preferredCategories: selectedCategories });
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="px-6 pb-4 pt-12">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-lg" style={{ color: '#1a3d3d' }}>
              ← Back
            </Text>
          </TouchableOpacity>

          <Text className="mb-2 text-2xl font-bold" style={{ color: '#1a3d3d' }}>
            Customize Categories
          </Text>
          <Text className="mb-6 text-base text-gray-600">
            Select your common expense categories
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  className="mb-4 items-center justify-center rounded-2xl p-4"
                  style={{
                    width: '48%',
                    backgroundColor: isSelected ? category.color + '20' : '#f5f5f5',
                    borderWidth: 2,
                    borderColor: isSelected ? category.color : 'transparent',
                  }}
                  onPress={() => toggleCategory(category.id)}>
                  <Text className="mb-2 text-4xl">{category.icon}</Text>
                  <Text className="text-base font-semibold text-gray-800">{category.name}</Text>
                  {isSelected && (
                    <View
                      className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: category.color }}>
                      <Text className="text-xs text-white">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              className="mb-4 items-center justify-center rounded-2xl bg-gray-100 p-4"
              style={{ width: '48%' }}>
              <Text className="mb-2 text-4xl">➕</Text>
              <Text className="text-base font-semibold text-gray-600">Add Custom</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 px-6 py-4">
        <Text className="mb-3 text-center text-sm text-gray-600">
          {selectedCategories.length} categories selected
        </Text>
        <TouchableOpacity
          className="items-center rounded-full py-4"
          style={{ backgroundColor: '#1a3d3d' }}
          onPress={handleFinish}>
          <Text className="text-lg font-semibold text-white">Finish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
