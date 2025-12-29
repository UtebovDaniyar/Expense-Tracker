import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { useBudgetStore, useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils/currency';
import { getCategoryConfig, CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/models';

export default function BudgetScreen() {
  const router = useRouter();
  const {
    budget,
    categoryBudgets,
    budgetAlerts,
    setBudget,
    addCategoryBudget,
    updateCategoryBudget,
    deleteCategoryBudget,
    getBudgetStatus,
    getCategoryBudgetStatus,
    updateBudgetAlerts,
    loadBudget,
  } = useBudgetStore();
  const { settings } = useSettingsStore();

  // Reload budget data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBudget();
    }, [loadBudget])
  );

  const [showEditBudget, setShowEditBudget] = useState(false);
  const [showAddCategoryBudget, setShowAddCategoryBudget] = useState(false);
  const [showEditCategoryBudget, setShowEditCategoryBudget] = useState(false);
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('food');
  const [categoryBudgetAmount, setCategoryBudgetAmount] = useState('');
  const [editingCategoryBudgetId, setEditingCategoryBudgetId] = useState<string | null>(null);

  const budgetStatus = useMemo(() => getBudgetStatus(), [budget, getBudgetStatus]);

  // Get current month name
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate donut chart percentage
  const donutPercentage = budgetStatus.percentageUsed;
  const donutColor =
    donutPercentage >= 100 ? '#f44336' : donutPercentage >= 75 ? '#ff9800' : '#4caf50';

  const handleEditBudget = () => {
    setEditBudgetAmount(budget?.amount.toString() || '');
    setShowEditBudget(true);
  };

  const handleSaveBudget = async () => {
    const amount = parseFloat(editBudgetAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      await setBudget(amount);
      setShowEditBudget(false);
      Alert.alert('Success', 'Budget updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update budget');
    }
  };

  const handleAddCategoryBudget = async () => {
    const amount = parseFloat(categoryBudgetAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    // Check if category already has a budget
    const existingBudget = categoryBudgets.find((cb) => cb.category === selectedCategory);
    if (existingBudget) {
      Alert.alert('Error', 'This category already has a budget. Please edit it instead.');
      return;
    }

    try {
      await addCategoryBudget(selectedCategory, amount);
      setShowAddCategoryBudget(false);
      setCategoryBudgetAmount('');
      Alert.alert('Success', 'Category budget added successfully');
    } catch (error: any) {
      console.error('Failed to add category budget:', error);

      // Check if it's a duplicate key error
      if (error.message && error.message.includes('duplicate key')) {
        Alert.alert(
          'Budget Already Exists',
          'This category already has a budget. Would you like to update it instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                // Find the existing budget (reload from store to get latest)
                const latestBudgets = useBudgetStore.getState().categoryBudgets;
                const existing = latestBudgets.find((cb) => cb.category === selectedCategory);
                if (existing) {
                  try {
                    await updateCategoryBudget(existing.id, amount);
                    setShowAddCategoryBudget(false);
                    setCategoryBudgetAmount('');
                    Alert.alert('Success', 'Category budget updated successfully');
                  } catch (updateError) {
                    Alert.alert('Error', 'Failed to update category budget');
                  }
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add category budget');
      }
    }
  };

  const handleEditCategoryBudget = (id: string, currentAmount: number, category: Category) => {
    setEditingCategoryBudgetId(id);
    setSelectedCategory(category);
    setCategoryBudgetAmount(currentAmount.toString());
    setShowEditCategoryBudget(true);
  };

  const handleSaveCategoryBudget = async () => {
    const amount = parseFloat(categoryBudgetAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    if (!editingCategoryBudgetId) {
      Alert.alert('Error', 'No budget selected for editing');
      return;
    }

    try {
      await updateCategoryBudget(editingCategoryBudgetId, amount);
      setShowEditCategoryBudget(false);
      setCategoryBudgetAmount('');
      setEditingCategoryBudgetId(null);
      Alert.alert('Success', 'Category budget updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update category budget');
    }
  };

  const handleDeleteCategoryBudget = (id: string, categoryName: string) => {
    Alert.alert(
      'Delete Category Budget',
      `Are you sure you want to delete the budget for ${categoryName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategoryBudget(id);
              Alert.alert('Success', 'Category budget deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category budget');
            }
          },
        },
      ]
    );
  };

  const toggleAlert = async (alertType: keyof typeof budgetAlerts) => {
    try {
      await updateBudgetAlerts({ [alertType]: !budgetAlerts[alertType] });
    } catch (error) {
      Alert.alert('Error', 'Failed to update alert settings');
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pb-4 pt-12">
        <View className="mb-2 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-2xl">←</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
            Budget
          </Text>
          <TouchableOpacity onPress={handleEditBudget}>
            <Text className="text-xl">⚙️</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-center text-sm text-gray-600">{currentMonth}</Text>
      </View>

      {/* Donut Chart Section */}
      <View className="mb-6 items-center px-6">
        <View className="relative mb-4 items-center justify-center">
          {/* Simple circular progress indicator */}
          <View
            className="h-48 w-48 items-center justify-center rounded-full"
            style={{
              backgroundColor: '#e8f5e9',
              borderWidth: 16,
              borderColor: donutColor,
            }}>
            <View className="items-center">
              <Text className="text-3xl font-bold" style={{ color: '#1a3d3d' }}>
                {formatCurrency(budgetStatus.spent, settings.currencySymbol)}
              </Text>
              <Text className="text-sm text-gray-600">
                of {formatCurrency(budgetStatus.totalBudget, settings.currencySymbol)}
              </Text>
              <Text className="mt-1 text-lg font-semibold" style={{ color: donutColor }}>
                {donutPercentage}%
              </Text>
            </View>
          </View>
        </View>

        {/* Budget Status */}
        <View className="mb-4 w-full rounded-2xl p-4" style={{ backgroundColor: '#e8f5e9' }}>
          <View className="mb-2 flex-row justify-between">
            <Text className="text-sm text-gray-600">Remaining</Text>
            <Text
              className="text-base font-bold"
              style={{ color: budgetStatus.remaining >= 0 ? '#4caf50' : '#f44336' }}>
              {formatCurrency(Math.abs(budgetStatus.remaining), settings.currencySymbol)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Status</Text>
            <Text className="text-sm font-semibold" style={{ color: donutColor }}>
              {donutPercentage >= 100 ? 'Exceeded' : donutPercentage >= 75 ? 'Warning' : 'On Track'}
            </Text>
          </View>
        </View>

        {/* Daily Budget Card */}
        <View className="w-full rounded-2xl p-4" style={{ backgroundColor: '#f4d03f20' }}>
          <Text className="mb-2 text-sm text-gray-600">Daily Budget</Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold" style={{ color: '#1a3d3d' }}>
                {formatCurrency(budgetStatus.dailyAllowance, settings.currencySymbol)}
              </Text>
              <Text className="text-xs text-gray-600">
                {budgetStatus.daysRemaining} days remaining
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-sm text-gray-600">Spent Today</Text>
              <Text className="text-lg font-semibold" style={{ color: '#f44336' }}>
                {formatCurrency(budgetStatus.spentToday, settings.currencySymbol)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Category Budgets Section */}
      <View className="mb-6 px-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold" style={{ color: '#1a3d3d' }}>
            Category Budgets
          </Text>
          <TouchableOpacity
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: '#1a3d3d' }}
            onPress={() => setShowAddCategoryBudget(true)}>
            <Text className="text-sm font-semibold text-white">+ Add</Text>
          </TouchableOpacity>
        </View>

        {categoryBudgets.length === 0 ? (
          <View className="items-center rounded-2xl p-6" style={{ backgroundColor: '#e8f5e9' }}>
            <Text className="mb-2 text-4xl">💰</Text>
            <Text className="mb-1 text-center text-base font-semibold" style={{ color: '#1a3d3d' }}>
              No Category Budgets
            </Text>
            <Text className="text-center text-sm text-gray-600">
              Set budgets for specific categories to track spending better
            </Text>
          </View>
        ) : (
          categoryBudgets.map((cb) => {
            const status = getCategoryBudgetStatus(cb.category);
            const category = getCategoryConfig(cb.category);

            if (!status || !category) return null;

            const progressColor =
              status.status === 'exceeded'
                ? '#f44336'
                : status.status === 'warning'
                  ? '#ff9800'
                  : '#4caf50';

            return (
              <View
                key={cb.id}
                className="mb-3 rounded-2xl p-4"
                style={{ backgroundColor: '#f5f5f5' }}>
                <View className="mb-3 flex-row items-center">
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: category.color + '20' }}>
                    <Text className="text-xl">{category.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold" style={{ color: '#1a3d3d' }}>
                      {category.name}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      {formatCurrency(status.spent, settings.currencySymbol)} /{' '}
                      {formatCurrency(status.budget, settings.currencySymbol)}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      className="mr-3"
                      onPress={() => handleEditCategoryBudget(cb.id, cb.amount, cb.category)}>
                      <Text className="text-xl">✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategoryBudget(cb.id, category.name)}>
                      <Text className="text-xl">🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mb-2 h-2 rounded-full" style={{ backgroundColor: '#e0e0e0' }}>
                  <View
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: progressColor,
                      width: `${Math.min(status.percentageUsed, 100)}%`,
                    }}
                  />
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">{status.percentageUsed}% used</Text>
                  <Text className="text-xs font-semibold" style={{ color: progressColor }}>
                    {status.status === 'exceeded'
                      ? 'Exceeded'
                      : status.status === 'warning'
                        ? 'Warning'
                        : 'On Track'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Budget Alerts Section */}
      <View className="px-6 pb-8">
        <Text className="mb-4 text-lg font-bold" style={{ color: '#1a3d3d' }}>
          Budget Alerts
        </Text>

        <View className="rounded-2xl p-4" style={{ backgroundColor: '#f5f5f5' }}>
          <View className="flex-row items-center justify-between border-b border-gray-300 py-3">
            <Text className="text-sm" style={{ color: '#1a3d3d' }}>
              Alert at 50%
            </Text>
            <TouchableOpacity
              className="h-6 w-12 justify-center rounded-full"
              style={{ backgroundColor: budgetAlerts.enabled50Percent ? '#4caf50' : '#e0e0e0' }}
              onPress={() => toggleAlert('enabled50Percent')}>
              <View
                className="h-5 w-5 rounded-full bg-white"
                style={{
                  marginLeft: budgetAlerts.enabled50Percent ? 24 : 2,
                }}
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between border-b border-gray-300 py-3">
            <Text className="text-sm" style={{ color: '#1a3d3d' }}>
              Alert at 75%
            </Text>
            <TouchableOpacity
              className="h-6 w-12 justify-center rounded-full"
              style={{ backgroundColor: budgetAlerts.enabled75Percent ? '#4caf50' : '#e0e0e0' }}
              onPress={() => toggleAlert('enabled75Percent')}>
              <View
                className="h-5 w-5 rounded-full bg-white"
                style={{
                  marginLeft: budgetAlerts.enabled75Percent ? 24 : 2,
                }}
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between border-b border-gray-300 py-3">
            <Text className="text-sm" style={{ color: '#1a3d3d' }}>
              Alert at 90%
            </Text>
            <TouchableOpacity
              className="h-6 w-12 justify-center rounded-full"
              style={{ backgroundColor: budgetAlerts.enabled90Percent ? '#4caf50' : '#e0e0e0' }}
              onPress={() => toggleAlert('enabled90Percent')}>
              <View
                className="h-5 w-5 rounded-full bg-white"
                style={{
                  marginLeft: budgetAlerts.enabled90Percent ? 24 : 2,
                }}
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-sm" style={{ color: '#1a3d3d' }}>
              Daily Limit Alert
            </Text>
            <TouchableOpacity
              className="h-6 w-12 justify-center rounded-full"
              style={{ backgroundColor: budgetAlerts.enabledDailyLimit ? '#4caf50' : '#e0e0e0' }}
              onPress={() => toggleAlert('enabledDailyLimit')}>
              <View
                className="h-5 w-5 rounded-full bg-white"
                style={{
                  marginLeft: budgetAlerts.enabledDailyLimit ? 24 : 2,
                }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Edit Budget Modal */}
      <Modal
        visible={showEditBudget}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditBudget(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="rounded-t-3xl bg-white p-6">
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>

            <Text className="mb-4 text-xl font-bold" style={{ color: '#1a3d3d' }}>
              Edit Monthly Budget
            </Text>

            <View className="mb-4">
              <Text className="mb-2 text-sm text-gray-600">Budget Amount</Text>
              <View
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: '#f5f5f5' }}>
                <Text className="mr-2 text-lg" style={{ color: '#1a3d3d' }}>
                  {settings.currencySymbol}
                </Text>
                <TextInput
                  className="flex-1 text-lg"
                  value={editBudgetAmount}
                  onChangeText={setEditBudgetAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: '#e8f5e9' }}
                onPress={() => setShowEditBudget(false)}>
                <Text className="font-semibold" style={{ color: '#1a3d3d' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: '#1a3d3d' }}
                onPress={handleSaveBudget}>
                <Text className="font-semibold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Budget Modal */}
      <Modal
        visible={showAddCategoryBudget}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCategoryBudget(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="rounded-t-3xl bg-white p-6">
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>

            <Text className="mb-4 text-xl font-bold" style={{ color: '#1a3d3d' }}>
              Add Category Budget
            </Text>

            <View className="mb-4">
              <Text className="mb-2 text-sm text-gray-600">Select Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
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
                      onPress={() => setSelectedCategory(cat.id)}>
                      <Text className="mb-1 text-2xl">{cat.icon}</Text>
                      <Text className="text-xs font-semibold text-gray-800">{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-sm text-gray-600">Budget Amount</Text>
              <View
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: '#f5f5f5' }}>
                <Text className="mr-2 text-lg" style={{ color: '#1a3d3d' }}>
                  {settings.currencySymbol}
                </Text>
                <TextInput
                  className="flex-1 text-lg"
                  value={categoryBudgetAmount}
                  onChangeText={setCategoryBudgetAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: '#e8f5e9' }}
                onPress={() => setShowAddCategoryBudget(false)}>
                <Text className="font-semibold" style={{ color: '#1a3d3d' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: '#1a3d3d' }}
                onPress={handleAddCategoryBudget}>
                <Text className="font-semibold text-white">Add Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Category Budget Modal */}
      <Modal
        visible={showEditCategoryBudget}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditCategoryBudget(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="rounded-t-3xl bg-white p-6">
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>

            <Text className="mb-4 text-xl font-bold" style={{ color: '#1a3d3d' }}>
              Edit Category Budget
            </Text>

            <View className="mb-4">
              <Text className="mb-2 text-sm text-gray-600">Category</Text>
              <View className="items-center rounded-2xl p-4" style={{ backgroundColor: '#f5f5f5' }}>
                {(() => {
                  const category = getCategoryConfig(selectedCategory);
                  if (!category) return null;
                  return (
                    <>
                      <Text className="mb-1 text-3xl">{category.icon}</Text>
                      <Text className="text-base font-semibold text-gray-800">{category.name}</Text>
                    </>
                  );
                })()}
              </View>
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-sm text-gray-600">Budget Amount</Text>
              <View
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: '#f5f5f5' }}>
                <Text className="mr-2 text-lg" style={{ color: '#1a3d3d' }}>
                  {settings.currencySymbol}
                </Text>
                <TextInput
                  className="flex-1 text-lg"
                  value={categoryBudgetAmount}
                  onChangeText={setCategoryBudgetAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                className="mr-2 flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: '#e8f5e9' }}
                onPress={() => {
                  setShowEditCategoryBudget(false);
                  setCategoryBudgetAmount('');
                  setEditingCategoryBudgetId(null);
                }}>
                <Text className="font-semibold" style={{ color: '#1a3d3d' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-full py-4"
                style={{ backgroundColor: '#1a3d3d' }}
                onPress={handleSaveCategoryBudget}>
                <Text className="font-semibold text-white">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
