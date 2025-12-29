import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useGoalsStore, useSettingsStore } from '@/store';
import { BRAND_COLORS } from '@/constants/colors';

const GOAL_ICONS = ['🎯', '🏠', '✈️', '🚗', '💍', '🎓', '💰', '🏖️', '📱', '🎮'];

export default function AddGoalModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addGoal, updateGoal, goals } = useGoalsStore();
  const { settings } = useSettingsStore();

  // Check if editing existing goal
  const goalId = params.id as string | undefined;
  const editingGoal = goalId ? goals.find((g) => g.id === goalId) : null;

  const [goalName, setGoalName] = useState(editingGoal?.name || '');
  const [targetAmount, setTargetAmount] = useState(editingGoal?.targetAmount.toString() || '');
  const [targetDate, setTargetDate] = useState(
    editingGoal?.targetDate ? new Date(editingGoal.targetDate).toISOString().split('T')[0] : ''
  );
  const [selectedIcon, setSelectedIcon] = useState(editingGoal?.icon || '🎯');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    const amount = parseFloat(targetAmount);

    if (!goalName.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    if (!targetDate) {
      Alert.alert('Error', 'Please select a target date');
      return;
    }

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          name: goalName,
          targetAmount: amount,
          targetDate: new Date(targetDate).toISOString(),
          icon: selectedIcon,
        });
        Alert.alert('Success', 'Goal updated successfully');
      } else {
        await addGoal({
          name: goalName,
          targetAmount: amount,
          currentAmount: 0,
          targetDate: new Date(targetDate).toISOString(),
          status: 'active',
          icon: selectedIcon,
        });
        Alert.alert('Success', 'Goal created successfully');
      }

      handleClose();
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert(
        'Error',
        `Failed to ${editingGoal ? 'update' : 'create'} goal: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleClose = () => {
    router.back();
  };

  // Generate date suggestions
  const getDateSuggestions = () => {
    const today = new Date();
    return [
      {
        label: '3 months',
        date: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
      },
      {
        label: '6 months',
        date: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
      {
        label: '1 year',
        date: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    ];
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6">
          {/* Title */}
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-2xl font-bold" style={{ color: BRAND_COLORS.primary }}>
              {editingGoal ? 'Edit Goal' : 'Create New Goal'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text className="text-2xl text-gray-500">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Goal Icon Selector */}
          <View className="mb-6">
            <Text className="mb-3 text-sm font-semibold text-gray-700">Choose Icon (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {GOAL_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  className="mr-3 h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: selectedIcon === icon ? BRAND_COLORS.accent + '40' : '#f5f5f5',
                    borderWidth: selectedIcon === icon ? 2 : 0,
                    borderColor: BRAND_COLORS.accent,
                  }}
                  onPress={() => setSelectedIcon(icon)}>
                  <Text className="text-2xl">{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Goal Name */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-gray-700">Goal Name</Text>
            <TextInput
              className="rounded-2xl px-4 py-3 text-base"
              style={{ backgroundColor: '#f5f5f5' }}
              placeholder="e.g., Vacation Fund, New Car"
              value={goalName}
              onChangeText={setGoalName}
              maxLength={50}
            />
          </View>

          {/* Target Amount */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-gray-700">Target Amount</Text>
            <View
              className="flex-row items-center rounded-2xl px-4 py-3"
              style={{ backgroundColor: '#f5f5f5' }}>
              <Text className="mr-2 text-lg" style={{ color: BRAND_COLORS.primary }}>
                {settings.currencySymbol}
              </Text>
              <TextInput
                className="flex-1 text-base"
                placeholder="0.00"
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Target Date */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-gray-700">Target Date</Text>
            <TouchableOpacity
              className="flex-row items-center rounded-2xl px-4 py-3"
              style={{ backgroundColor: '#f5f5f5' }}
              onPress={() => setShowDatePicker(!showDatePicker)}>
              <Text className="mr-2 text-lg">📅</Text>
              <Text className="flex-1 text-base text-gray-700">
                {targetDate
                  ? new Date(targetDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Select target date'}
              </Text>
            </TouchableOpacity>

            {/* Date Suggestions */}
            {showDatePicker && (
              <View className="mt-3">
                <Text className="mb-2 text-xs text-gray-600">Quick Select:</Text>
                <View className="flex-row flex-wrap">
                  {getDateSuggestions().map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.label}
                      className="mb-2 mr-2 rounded-full px-4 py-2"
                      style={{ backgroundColor: BRAND_COLORS.accent + '20' }}
                      onPress={() => {
                        setTargetDate(suggestion.date.toISOString().split('T')[0]);
                        setShowDatePicker(false);
                      }}>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: BRAND_COLORS.primary }}>
                        {suggestion.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Manual Date Input */}
                <TextInput
                  className="mt-2 rounded-xl px-4 py-2"
                  style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }}
                  placeholder="YYYY-MM-DD"
                  value={targetDate}
                  onChangeText={setTargetDate}
                />
              </View>
            )}
          </View>

          {/* Info Card */}
          <View
            className="mb-6 rounded-2xl p-4"
            style={{ backgroundColor: BRAND_COLORS.secondary + '20' }}>
            <Text className="text-xs text-gray-700">
              💡 Tip: Set realistic goals and track your progress regularly to stay motivated!
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row">
            <TouchableOpacity
              className="mr-2 flex-1 items-center rounded-full py-4"
              style={{ backgroundColor: '#e8f5e9' }}
              onPress={handleClose}>
              <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 items-center rounded-full py-4"
              style={{ backgroundColor: BRAND_COLORS.primary }}
              onPress={handleSave}>
              <Text className="font-semibold text-white">
                {editingGoal ? 'Save Changes' : 'Create Goal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
