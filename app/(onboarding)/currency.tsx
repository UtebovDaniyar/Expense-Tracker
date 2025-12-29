import { View, Text, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSettingsStore } from '@/store';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
];

export default function CurrencySelectionScreen() {
  const router = useRouter();
  const { updateSettings } = useSettingsStore();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCurrencies = CURRENCIES.filter(
    (currency) =>
      currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContinue = async () => {
    if (selectedCurrency) {
      await updateSettings({
        currency: selectedCurrency.code,
        currencySymbol: selectedCurrency.symbol,
      });
      router.push('/(onboarding)/budget');
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pb-4 pt-12">
        <View className="mb-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-lg" style={{ color: '#1a3d3d' }}>
              ← Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(onboarding)/budget')}>
            <Text className="text-base text-gray-500">Skip</Text>
          </TouchableOpacity>
        </View>

        <Text className="mb-2 text-2xl font-bold" style={{ color: '#1a3d3d' }}>
          Select Your Currency
        </Text>
        <Text className="mb-4 text-base text-gray-600">Choose your primary currency</Text>

        <View className="flex-row items-center rounded-lg bg-gray-100 px-4 py-3">
          <Text className="mr-2 text-gray-400">🔍</Text>
          <TextInput
            className="flex-1 text-base"
            placeholder="Search currency"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredCurrencies}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center border-b border-gray-100 px-6 py-4"
            onPress={() => setSelectedCurrency(item)}>
            <Text className="mr-4 text-3xl">{item.flag}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
              <Text className="text-sm text-gray-500">{item.code}</Text>
            </View>
            <View
              className="h-6 w-6 items-center justify-center rounded-full border-2"
              style={{
                borderColor: selectedCurrency?.code === item.code ? '#1a3d3d' : '#d1d5db',
              }}>
              {selectedCurrency?.code === item.code && (
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: '#1a3d3d' }} />
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <View className="border-t border-gray-200 px-6 py-4">
        <TouchableOpacity
          className="items-center rounded-full py-4"
          style={{
            backgroundColor: selectedCurrency ? '#1a3d3d' : '#d1d5db',
          }}
          onPress={handleContinue}
          disabled={!selectedCurrency}>
          <Text className="text-lg font-semibold text-white">Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
