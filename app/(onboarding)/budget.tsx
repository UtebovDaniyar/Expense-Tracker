import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useBudgetStore, useSettingsStore } from '@/store';

const QUICK_AMOUNTS = [500, 1000, 1500, 2000];

export default function BudgetSetupScreen() {
  const router = useRouter();
  const { setBudget } = useBudgetStore();
  const { settings } = useSettingsStore();
  const [amount, setAmount] = useState('');

  const handleSetBudget = async () => {
    const budgetAmount = parseFloat(amount);
    if (budgetAmount > 0) {
      await setBudget(budgetAmount);
      router.push('/(onboarding)/categories');
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/categories');
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 pb-4 pt-12">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-lg" style={{ color: '#1a3d3d' }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <View className="mb-6 h-1 rounded-full bg-gray-200">
          <View className="h-1 rounded-full" style={{ width: '75%', backgroundColor: '#1a3d3d' }} />
        </View>

        <Text className="mb-2 text-2xl font-bold" style={{ color: '#1a3d3d' }}>
          Set Your Monthly Budget
        </Text>
        <Text className="mb-8 text-base text-gray-600">This helps you track your spending</Text>

        <View className="mb-8 items-center">
          <View className="flex-row items-center">
            <Text className="mr-2 text-4xl font-bold text-gray-400">{settings.currencySymbol}</Text>
            <TextInput
              className="text-center text-5xl font-bold"
              style={{ color: '#1a3d3d', minWidth: 200 }}
              placeholder="0"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="mb-3 text-sm text-gray-600">Quick select:</Text>
          <View className="flex-row flex-wrap">
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                className="mb-3 mr-3 rounded-full px-6 py-3"
                style={{ backgroundColor: '#e8f5e9' }}
                onPress={() => handleQuickAmount(value)}>
                <Text className="text-base font-semibold" style={{ color: '#1a3d3d' }}>
                  {settings.currencySymbol}
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-8 rounded-lg p-4" style={{ backgroundColor: '#e8f5e9' }}>
          <View className="flex-row">
            <Text className="mr-2 text-xl">💡</Text>
            <View className="flex-1">
              <Text className="text-sm text-gray-700">
                Set a realistic budget based on your monthly income and expenses. You can always
                adjust it later.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="mb-3 items-center rounded-full py-4"
          style={{
            backgroundColor: amount && parseFloat(amount) > 0 ? '#1a3d3d' : '#d1d5db',
          }}
          onPress={handleSetBudget}
          disabled={!amount || parseFloat(amount) <= 0}>
          <Text className="text-lg font-semibold text-white">Set Budget</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center py-3" onPress={handleSkip}>
          <Text className="text-base text-gray-500">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
