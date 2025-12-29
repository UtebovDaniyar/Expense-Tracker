import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useGoalsStore, useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils/currency';
import { BRAND_COLORS } from '@/constants/colors';

export default function GoalsScreen() {
  const router = useRouter();
  const { goals, updateGoal, deleteGoal, addFundsToGoal } = useGoalsStore();
  const { settings } = useSettingsStore();
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingGoalId, setFundingGoalId] = useState<string | null>(null);
  const [fundingAmount, setFundingAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const handleEditGoal = (goalId: string) => {
    router.push(`/(modals)/add-goal?id=${goalId}` as any);
  };

  const handlePauseGoal = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      await updateGoal(goalId, {
        status: goal.status === 'paused' ? 'active' : 'paused',
      });
      Alert.alert(
        'Success',
        `Goal ${goal.status === 'paused' ? 'resumed' : 'paused'} successfully`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal status');
    }
  };

  const handleAddFunds = (goalId: string) => {
    setFundingGoalId(goalId);
    setShowFundingModal(true);
  };

  const handleSaveFunds = async () => {
    const amount = parseFloat(fundingAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!fundingGoalId) return;

    try {
      await addFundsToGoal(fundingGoalId, amount);
      setShowFundingModal(false);
      setFundingAmount('');
      setFundingGoalId(null);
      Alert.alert('Success', 'Funds added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add funds');
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goalId);
            Alert.alert('Success', 'Goal deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete goal');
          }
        },
      },
    ]);
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pb-4 pt-12" style={{ backgroundColor: BRAND_COLORS.primary }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-2xl text-white">←</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Goals</Text>
          <TouchableOpacity onPress={() => router.push('/(modals)/add-goal' as any)}>
            <Text className="text-2xl text-white">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View className="flex-row border-b border-gray-200 bg-white px-6">
        <TouchableOpacity
          className="mr-6 py-4"
          style={{
            borderBottomWidth: activeTab === 'active' ? 2 : 0,
            borderBottomColor: BRAND_COLORS.primary,
          }}
          onPress={() => setActiveTab('active')}>
          <Text
            className="font-semibold"
            style={{
              color: activeTab === 'active' ? BRAND_COLORS.primary : '#9e9e9e',
            }}>
            Active Goals ({activeGoals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="py-4"
          style={{
            borderBottomWidth: activeTab === 'completed' ? 2 : 0,
            borderBottomColor: BRAND_COLORS.primary,
          }}
          onPress={() => setActiveTab('completed')}>
          <Text
            className="font-semibold"
            style={{
              color: activeTab === 'completed' ? BRAND_COLORS.primary : '#9e9e9e',
            }}>
            Completed ({completedGoals.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Active Goals Tab */}
        {activeTab === 'active' && (
          <View className="px-6 py-6">
            {activeGoals.length === 0 ? (
              <View className="items-center rounded-2xl p-8" style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="mb-2 text-4xl">🎯</Text>
                <Text
                  className="mb-1 text-center text-base font-semibold"
                  style={{ color: BRAND_COLORS.primary }}>
                  No active goals
                </Text>
                <Text className="mb-4 text-center text-sm text-gray-600">
                  Create your first financial goal to get started
                </Text>
                <TouchableOpacity
                  className="rounded-full px-6 py-3"
                  style={{ backgroundColor: BRAND_COLORS.primary }}
                  onPress={() => router.push('/(modals)/add-goal' as any)}>
                  <Text className="font-semibold text-white">Create Goal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              activeGoals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const remaining = goal.targetAmount - goal.currentAmount;
                const isPaused = goal.status === 'paused';

                return (
                  <View
                    key={goal.id}
                    className="mb-4 rounded-2xl p-4"
                    style={{
                      backgroundColor: isPaused ? '#f5f5f5' : '#e8f5e9',
                      opacity: isPaused ? 0.7 : 1,
                    }}>
                    <View className="mb-3 flex-row items-start justify-between">
                      <View
                        className="mr-3 h-12 w-12 items-center justify-center rounded-full"
                        style={{ backgroundColor: BRAND_COLORS.accent + '40' }}>
                        <Text className="text-2xl">{goal.icon || '🎯'}</Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="mb-1 text-lg font-bold"
                          style={{ color: BRAND_COLORS.primary }}>
                          {goal.name}
                        </Text>
                        <Text className="text-xs text-gray-600">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </Text>
                        <View
                          className="mt-1 self-start rounded-full px-2 py-1"
                          style={{
                            backgroundColor: isPaused ? '#ff9800' : BRAND_COLORS.accent + '40',
                          }}>
                          <Text className="text-xs font-semibold text-gray-700">
                            {isPaused ? 'Paused' : 'Ongoing'}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row">
                        <TouchableOpacity className="mr-2" onPress={() => handleAddFunds(goal.id)}>
                          <View
                            className="h-8 w-8 items-center justify-center rounded-full"
                            style={{ backgroundColor: BRAND_COLORS.success }}>
                            <Text className="text-lg font-bold text-white">+</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert('Goal Options', 'Choose an action', [
                              {
                                text: 'Edit',
                                onPress: () => handleEditGoal(goal.id),
                              },
                              {
                                text: isPaused ? 'Resume' : 'Pause',
                                onPress: () => handlePauseGoal(goal.id),
                              },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => handleDeleteGoal(goal.id),
                              },
                              { text: 'Cancel', style: 'cancel' },
                            ])
                          }>
                          <Text className="text-xl">⋮</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="mb-2 h-3 rounded-full bg-gray-200">
                      <View
                        className="h-3 rounded-full"
                        style={{
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: BRAND_COLORS.success,
                        }}
                      />
                    </View>

                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600">
                        {formatCurrency(goal.currentAmount, settings.currencySymbol)} /{' '}
                        {formatCurrency(goal.targetAmount, settings.currencySymbol)}
                      </Text>
                      <View
                        className="rounded-full px-3 py-1"
                        style={{ backgroundColor: BRAND_COLORS.success }}>
                        <Text className="text-xs font-semibold text-white">
                          {Math.round(progress)}%
                        </Text>
                      </View>
                    </View>

                    <Text className="mt-2 text-xs text-gray-600">
                      Remaining: {formatCurrency(remaining, settings.currencySymbol)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Completed Goals Tab */}
        {activeTab === 'completed' && (
          <View className="px-6 py-6">
            {completedGoals.length === 0 ? (
              <View className="items-center rounded-2xl p-8" style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="mb-2 text-4xl">🏆</Text>
                <Text
                  className="mb-1 text-center text-base font-semibold"
                  style={{ color: BRAND_COLORS.primary }}>
                  No completed goals yet
                </Text>
                <Text className="text-center text-sm text-gray-600">
                  Complete your first goal to see it here
                </Text>
              </View>
            ) : (
              completedGoals.map((goal) => (
                <View
                  key={goal.id}
                  className="mb-4 rounded-2xl p-4"
                  style={{ backgroundColor: BRAND_COLORS.success + '20' }}>
                  <View className="flex-row items-center justify-between">
                    <View
                      className="mr-3 h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: BRAND_COLORS.success + '40' }}>
                      <Text className="text-2xl">{goal.icon || '🎯'}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-base font-bold text-gray-700">{goal.name}</Text>
                      <Text className="text-sm text-gray-600">
                        {formatCurrency(goal.targetAmount, settings.currencySymbol)}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500">
                        Completed: {new Date(goal.updatedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className="text-3xl">✅</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Funds Modal */}
      <Modal
        visible={showFundingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFundingModal(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="rounded-t-3xl bg-white p-6">
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>

            <Text className="mb-4 text-xl font-bold" style={{ color: BRAND_COLORS.primary }}>
              Add Funds to Goal
            </Text>

            <View className="mb-4">
              <Text className="mb-2 text-sm text-gray-600">Amount</Text>
              <View
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: '#f5f5f5' }}>
                <Text className="mr-2 text-lg" style={{ color: BRAND_COLORS.primary }}>
                  {settings.currencySymbol}
                </Text>
                <TextInput
                  className="flex-1 text-lg"
                  value={fundingAmount}
                  onChangeText={setFundingAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  autoFocus
                />
              </View>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: '#e8f5e9' }}
                onPress={() => {
                  setShowFundingModal(false);
                  setFundingAmount('');
                  setFundingGoalId(null);
                }}>
                <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: BRAND_COLORS.primary }}
                onPress={handleSaveFunds}>
                <Text className="font-semibold text-white">Add Funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
