import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTransactionsStore, useSettingsStore } from '@/store';
import { CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/models';
import DateTimePicker from '@react-native-community/datetimepicker';

type TransactionType = 'expense' | 'income';
type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function AddTransactionModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addTransaction, addRecurringTransaction, updateTransaction, transactions } =
    useTransactionsStore();
  const { settings } = useSettingsStore();

  // Check if editing existing transaction
  const transactionId = params.id as string | undefined;
  const existingTransaction = transactionId
    ? transactions.find((t) => t.id === transactionId)
    : null;

  const [amount, setAmount] = useState(existingTransaction?.amount.toString() || '');
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    existingTransaction?.category || 'food'
  );
  const [date, setDate] = useState(existingTransaction?.date || new Date().toISOString());
  const [description, setDescription] = useState(existingTransaction?.description || '');
  const [transactionType, setTransactionType] = useState<TransactionType>(
    existingTransaction?.type || 'expense'
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleSave = async () => {
    const amountValue = parseFloat(amount);

    if (!amountValue || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      if (existingTransaction) {
        // Update existing transaction
        await updateTransaction(existingTransaction.id, {
          amount: amountValue,
          category: selectedCategory,
          date,
          description,
          type: transactionType,
        });
        Alert.alert('Success', 'Transaction updated successfully');
      } else {
        // Add new transaction
        if (isRecurring) {
          await addRecurringTransaction({
            type: transactionType,
            amount: amountValue,
            category: selectedCategory,
            description,
            frequency,
            startDate: date,
            endDate,
            lastCreated: date,
            isActive: true,
          });
          Alert.alert('Success', 'Recurring transaction created successfully');
        } else {
          await addTransaction({
            type: transactionType,
            amount: amountValue,
            category: selectedCategory,
            date,
            description,
          });
          Alert.alert('Success', 'Transaction added successfully');
        }
      }

      // Close modal and return to previous screen
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save transaction');
    }
  };

  const handleSetToday = () => {
    setDate(new Date().toISOString());
  };

  const formatDateDisplay = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeDisplay = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentDate = new Date(date);
      selectedDate.setHours(currentDate.getHours());
      selectedDate.setMinutes(currentDate.getMinutes());
      setDate(selectedDate.toISOString());
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const currentDate = new Date(date);
      currentDate.setHours(selectedTime.getHours());
      currentDate.setMinutes(selectedTime.getMinutes());
      setDate(currentDate.toISOString());
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate.toISOString());
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Drag Handle */}
      <View className="items-center py-3">
        <View className="h-1 w-10 rounded-full bg-gray-300" />
      </View>

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4">
        <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
          {existingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-lg text-gray-500">✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Transaction Type Toggle */}
        <View className="mb-6 flex-row rounded-full p-1" style={{ backgroundColor: '#e8f5e9' }}>
          <TouchableOpacity
            className="flex-1 items-center rounded-full py-3"
            style={{ backgroundColor: transactionType === 'expense' ? '#1a3d3d' : 'transparent' }}
            onPress={() => setTransactionType('expense')}>
            <Text
              className="font-semibold"
              style={{ color: transactionType === 'expense' ? 'white' : '#1a3d3d' }}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center rounded-full py-3"
            style={{ backgroundColor: transactionType === 'income' ? '#1a3d3d' : 'transparent' }}
            onPress={() => setTransactionType('income')}>
            <Text
              className="font-semibold"
              style={{ color: transactionType === 'income' ? 'white' : '#1a3d3d' }}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View className="mb-6">
          <Text className="mb-2 text-sm text-gray-600">Amount</Text>
          <View
            className="flex-row items-center rounded-2xl border-2 px-4 py-3"
            style={{ borderColor: '#e8f5e9' }}>
            <Text className="mr-2 text-2xl font-bold text-gray-400">{settings.currencySymbol}</Text>
            <TextInput
              className="flex-1 text-2xl font-bold"
              style={{ color: '#1a3d3d' }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Category Selection */}
        <View className="mb-6">
          <Text className="mb-2 text-sm text-gray-600">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  className="mr-3 items-center"
                  onPress={() => setSelectedCategory(category.id)}>
                  <View
                    className="mb-2 h-16 w-16 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: isSelected ? category.color : category.color + '20',
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: category.color,
                    }}>
                    <Text className="text-2xl">{category.icon}</Text>
                  </View>
                  <Text className="text-xs text-gray-600">{category.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Date Selection */}
        <View className="mb-6">
          <Text className="mb-2 text-sm text-gray-600">Date</Text>
          <View className="flex-row">
            <TouchableOpacity
              className="mr-2 flex-1 rounded-2xl border-2 px-4 py-3"
              style={{ borderColor: '#e8f5e9' }}
              onPress={() => setShowDatePicker(true)}>
              <Text className="text-base" style={{ color: '#1a3d3d' }}>
                📅 {formatDateDisplay(date)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center justify-center rounded-2xl px-6 py-3"
              style={{ backgroundColor: '#e8f5e9' }}
              onPress={handleSetToday}>
              <Text className="font-semibold" style={{ color: '#1a3d3d' }}>
                Today
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Selection */}
        <View className="mb-6">
          <Text className="mb-2 text-sm text-gray-600">Time (Optional)</Text>
          <TouchableOpacity
            className="rounded-2xl border-2 px-4 py-3"
            style={{ borderColor: '#e8f5e9' }}
            onPress={() => setShowTimePicker(true)}>
            <Text className="text-base" style={{ color: '#1a3d3d' }}>
              🕐 {formatTimeDisplay(date)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Description */}
        <View className="mb-6">
          <Text className="mb-2 text-sm text-gray-600">Description (Optional)</Text>
          <TextInput
            className="rounded-2xl border-2 px-4 py-3 text-base"
            style={{ borderColor: '#e8f5e9', color: '#1a3d3d' }}
            placeholder="Add a note..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text className="mt-1 text-right text-xs text-gray-400">{description.length}/200</Text>
        </View>

        {/* Recurring Transaction Toggle */}
        {!existingTransaction && (
          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold" style={{ color: '#1a3d3d' }}>
                  Recurring Transaction
                </Text>
                <Text className="text-xs text-gray-500">Automatically create this transaction</Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#d1d5db', true: '#4dd0e1' }}
                thumbColor={isRecurring ? '#1a3d3d' : '#f4f3f4'}
              />
            </View>

            {/* Frequency Selection */}
            {isRecurring && (
              <View className="rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="mb-3 text-sm text-gray-600">Frequency</Text>
                <View className="mb-4 flex-row flex-wrap">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as Frequency[]).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      className="mb-2 mr-2 rounded-full px-4 py-2"
                      style={{
                        backgroundColor: frequency === freq ? '#1a3d3d' : 'white',
                      }}
                      onPress={() => setFrequency(freq)}>
                      <Text
                        className="text-sm font-semibold capitalize"
                        style={{ color: frequency === freq ? 'white' : '#1a3d3d' }}>
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* End Date (Optional) */}
                <Text className="mb-2 text-sm text-gray-600">End Date (Optional)</Text>
                <TouchableOpacity
                  className="rounded-2xl border-2 bg-white px-4 py-3"
                  style={{ borderColor: '#d1d5db' }}
                  onPress={() => setShowEndDatePicker(true)}>
                  <Text className="text-base" style={{ color: endDate ? '#1a3d3d' : '#9ca3af' }}>
                    📅 {endDate ? formatDateDisplay(endDate) : 'No end date'}
                  </Text>
                </TouchableOpacity>
                {endDate && (
                  <TouchableOpacity className="mt-2" onPress={() => setEndDate(undefined)}>
                    <Text className="text-center text-sm" style={{ color: '#f44336' }}>
                      Clear end date
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* End Date Picker Modal */}
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate ? new Date(endDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndDateChange}
            minimumDate={new Date(date)}
          />
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View className="border-t border-gray-200 px-6 py-4">
        <View className="flex-row">
          <TouchableOpacity
            className="mr-2 flex-1 items-center rounded-full py-4"
            style={{ backgroundColor: '#e8f5e9' }}
            onPress={() => router.back()}>
            <Text className="font-semibold" style={{ color: '#1a3d3d' }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center rounded-full py-4"
            style={{ backgroundColor: '#1a3d3d' }}
            onPress={handleSave}>
            <Text className="font-semibold text-white">
              {existingTransaction ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
