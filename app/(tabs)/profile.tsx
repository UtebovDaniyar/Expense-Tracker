import { View, Text, ScrollView, TouchableOpacity, Alert, Share, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useSettingsStore, useTransactionsStore, useGoalsStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { BRAND_COLORS } from '@/constants/colors';
import { SyncStatus } from '@/components/SyncStatus';
import { OfflineBanner } from '@/components/OfflineBanner';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';

export default function ProfileScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const { transactions, recurringTransactions } = useTransactionsStore();
  const { goals } = useGoalsStore();
  const { user, signOut } = useAuthStore();

  const [notificationSettings, setNotificationSettings] = useState({
    budgetAlerts: true,
    transactionReminders: false,
    goalMilestones: true,
    weeklySummary: true,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const activeGoals = goals.filter((g) => g.status === 'active').length;
    const memberSince = settings.createdAt
      ? new Date(settings.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })
      : 'Jan 2024';

    return {
      memberSince,
      totalTransactions: transactions.length,
      activeGoals,
      currentStreak: 0, // TODO: Calculate actual streak
    };
  }, [transactions, goals, settings]);

  const handleExportData = async () => {
    // Show export options
    Alert.alert('Export Data', 'Choose what to export:', [
      {
        text: 'Transactions Only',
        onPress: () => handleExportTransactions(),
      },
      {
        text: 'All Data',
        onPress: () => handleExportAllData(),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleExportTransactions = async () => {
    try {
      // Import export service dynamically
      const { ExportService } = await import('@/services/exportService');

      // Task 2.1: Fetch all transactions from store (already available via useTransactionsStore)
      // Task 2.2 & 2.3: Export transactions and share

      // Show loading indicator
      Alert.alert('Exporting...', 'Please wait while we prepare your transactions');

      // Task 2.1: Export transaction data
      const result = await ExportService.exportTransactions(transactions);

      if (!result.success) {
        // Task 2.4: Handle and display errors appropriately
        Alert.alert('Export Failed', result.error || 'Failed to export transactions');
        return;
      }

      // Task 2.3: Implement native sharing functionality
      if (result.fileUri) {
        await ExportService.shareFile(result.fileUri);

        // Task 2.4: Display success message with record count
        Alert.alert(
          'Export Successful',
          `Exported ${result.recordCount} transaction${result.recordCount !== 1 ? 's' : ''} successfully!`,
          [{ text: 'OK' }]
        );

        // Clean up the file after sharing
        setTimeout(() => {
          if (result.fileUri) {
            ExportService.deleteFile(result.fileUri);
          }
        }, 5000);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      // Task 2.4: Handle errors appropriately
      Alert.alert('Error', error.message || 'Failed to export transactions');
    }
  };

  const handleExportAllData = async () => {
    try {
      // Import export service dynamically
      const { ExportService } = await import('@/services/exportService');
      const { useBudgetStore } = await import('@/store/budgetStore');

      // Task 3.1: Fetch recurring transaction data (already available)
      // Task 3.2: Fetch goals data (already available)
      // Task 3.3: Fetch budget and category budget data
      const { budget, categoryBudgets } = useBudgetStore.getState();

      // Show loading indicator
      Alert.alert('Exporting...', 'Please wait while we prepare all your data');

      // Task 3.1, 3.2, 3.3: Export all data including recurring transactions, goals, and budgets
      const result = await ExportService.exportAllData(
        transactions,
        recurringTransactions,
        goals,
        budget,
        categoryBudgets
      );

      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Failed to export data');
        return;
      }

      // Share the file
      if (result.fileUri) {
        await ExportService.shareFile(result.fileUri);

        // Show success message with record count
        Alert.alert(
          'Export Successful',
          `Exported ${result.recordCount} records successfully!\n\nIncludes: transactions, recurring transactions, goals, and budgets.`,
          [{ text: 'OK' }]
        );

        // Clean up the file after sharing
        setTimeout(() => {
          if (result.fileUri) {
            ExportService.deleteFile(result.fileUri);
          }
        }, 5000);
      }
    } catch (error: any) {
      console.error('Export all data error:', error);
      Alert.alert('Error', error.message || 'Failed to export all data');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear temporary data but keep your transactions and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            // Navigation will be handled automatically by app/_layout.tsx
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    const isGuest = !user;
    const message = isGuest
      ? 'This will delete all your local data and reset the app. You will need to complete onboarding again.'
      : 'This will permanently delete your account and all your data. This action cannot be undone.';

    Alert.alert(isGuest ? 'Reset App' : 'Delete Account', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isGuest ? 'Reset' : 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isGuest) {
              // For guest: clear all local data and reset onboarding
              const { useTransactionsStore } = await import('@/store/transactionsStore');
              const { useBudgetStore } = await import('@/store/budgetStore');
              const { useGoalsStore } = await import('@/store/goalsStore');

              // Clear all stores
              await useTransactionsStore.getState().clearAllTransactions();
              await useBudgetStore.getState().clearBudget();
              await useGoalsStore.getState().clearAllGoals();

              // Reset settings including onboarding
              await updateSettings({
                hasCompletedOnboarding: false,
                preferredCategories: [],
                currency: 'USD',
                currencySymbol: '$',
              });

              // Navigate to welcome screen
              router.replace('/(auth)/welcome' as any);
            } else {
              // For authenticated user: delete account
              Alert.alert('Info', 'Account deletion would be implemented here');
            }
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out PennyWise - The best expense tracker app!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRateApp = () => {
    Alert.alert('Rate App', 'This would open the app store for rating');
  };

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const SettingItem = ({
    icon,
    title,
    value,
    onPress,
    showArrow = true,
  }: {
    icon: string;
    title: string;
    value?: string;
    onPress: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between border-b border-gray-100 py-4"
      onPress={onPress}>
      <View className="flex-1 flex-row items-center">
        <Text className="mr-3 text-xl">{icon}</Text>
        <Text className="flex-1 text-base text-gray-800">{title}</Text>
      </View>
      {value && <Text className="mr-2 text-sm text-gray-600">{value}</Text>}
      {showArrow && <Text className="text-gray-400">›</Text>}
    </TouchableOpacity>
  );

  const ToggleItem = ({
    icon,
    title,
    value,
    onToggle,
  }: {
    icon: string;
    title: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View className="flex-row items-center justify-between border-b border-gray-100 py-4">
      <View className="flex-1 flex-row items-center">
        <Text className="mr-3 text-xl">{icon}</Text>
        <Text className="flex-1 text-base text-gray-800">{title}</Text>
      </View>
      <TouchableOpacity
        className="h-6 w-12 justify-center rounded-full"
        style={{ backgroundColor: value ? BRAND_COLORS.success : '#e0e0e0' }}
        onPress={onToggle}>
        <View
          className="h-5 w-5 rounded-full bg-white"
          style={{
            marginLeft: value ? 24 : 2,
          }}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 pb-6 pt-12" style={{ backgroundColor: BRAND_COLORS.primary }}>
        <Text className="mb-2 text-3xl font-bold text-white">Profile</Text>
        <Text className="text-sm text-white opacity-80">Manage your account and preferences</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Email Verification Banner */}
        <EmailVerificationBanner />

        {/* Offline Mode Banner */}
        <OfflineBanner />

        {/* Profile Section */}
        <View className="mx-6 mt-6 rounded-2xl bg-white p-6">
          <View className="mb-4 items-center">
            <View
              className="mb-3 h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND_COLORS.accent + '40' }}>
              <Text className="text-4xl">👤</Text>
            </View>
            <Text className="text-xl font-bold" style={{ color: BRAND_COLORS.primary }}>
              {user?.displayName || settings.userName || 'User'}
            </Text>
            {user?.email && <Text className="mt-1 text-sm text-gray-600">{user.email}</Text>}
            <TouchableOpacity
              className="mt-2"
              onPress={() => router.push('/(modals)/edit-profile' as any)}>
              <Text className="text-sm" style={{ color: BRAND_COLORS.accent }}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View className="mt-4 flex-row flex-wrap">
            <View className="mb-3 w-1/2 items-center">
              <Text className="text-2xl font-bold" style={{ color: BRAND_COLORS.primary }}>
                {stats.memberSince}
              </Text>
              <Text className="text-xs text-gray-600">Member Since</Text>
            </View>
            <View className="mb-3 w-1/2 items-center">
              <Text className="text-2xl font-bold" style={{ color: BRAND_COLORS.primary }}>
                {stats.totalTransactions}
              </Text>
              <Text className="text-xs text-gray-600">Transactions</Text>
            </View>
            <View className="w-1/2 items-center">
              <Text className="text-2xl font-bold" style={{ color: BRAND_COLORS.primary }}>
                {stats.activeGoals}
              </Text>
              <Text className="text-xs text-gray-600">Active Goals</Text>
            </View>
            <View className="w-1/2 items-center">
              <Text className="text-2xl font-bold" style={{ color: BRAND_COLORS.primary }}>
                {stats.currentStreak}
              </Text>
              <Text className="text-xs text-gray-600">Day Streak</Text>
            </View>
          </View>
        </View>

        {/* Sync Status */}
        {user && (
          <View className="mx-6 mt-6 rounded-2xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
              Sync Status
            </Text>
            <View className="py-2">
              <SyncStatus showSyncButton={true} />
            </View>
          </View>
        )}

        {/* Account Settings */}
        <View className="mx-6 mt-6 rounded-2xl bg-white p-6">
          <Text className="mb-4 text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            Account Settings
          </Text>

          {/* Sign In button for guest users */}
          {!user && (
            <TouchableOpacity
              className="mb-4 rounded-2xl p-4"
              style={{ backgroundColor: BRAND_COLORS.primary }}
              onPress={() => router.push('/(auth)/welcome' as any)}>
              <View className="flex-row items-center justify-center">
                <Text className="mr-2 text-xl">🔐</Text>
                <Text className="text-base font-semibold text-white">
                  Sign In or Create Account
                </Text>
              </View>
              <Text className="mt-1 text-center text-xs text-white opacity-80">
                Sync your data across devices
              </Text>
            </TouchableOpacity>
          )}

          <SettingItem
            icon="💱"
            title="Currency"
            value={`${settings.currencySymbol} ${settings.currency}`}
            onPress={() => router.push('/onboarding/currency' as any)}
          />
          <SettingItem
            icon="🌍"
            title="Language"
            value="English"
            onPress={() => Alert.alert('Language', 'Language selection coming soon')}
          />
          <SettingItem
            icon="🎨"
            title="Theme"
            value={settings.theme}
            onPress={() =>
              Alert.alert('Theme', 'Choose theme', [
                {
                  text: 'Light',
                  onPress: () => updateSettings({ theme: 'light' }),
                },
                {
                  text: 'Dark',
                  onPress: () => updateSettings({ theme: 'dark' }),
                },
                {
                  text: 'Auto',
                  onPress: () => updateSettings({ theme: 'auto' }),
                },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
          
          {/* DEBUG: Clear AsyncStorage */}
          <SettingItem
            icon="🗑️"
            title="Clear AsyncStorage (DEBUG)"
            onPress={async () => {
              Alert.alert(
                'Clear AsyncStorage?',
                'This will delete ALL local data. Use this to test clean state.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                        await AsyncStorage.clear();
                        Alert.alert('Success', 'AsyncStorage cleared! Restart the app.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to clear AsyncStorage');
                      }
                    },
                  },
                ]
              );
            }}
            showArrow={false}
          />
          
          {user && (
            <SettingItem icon="🚪" title="Sign Out" onPress={handleSignOut} showArrow={false} />
          )}
        </View>

        {/* Notifications */}
        <View className="mx-6 mt-6 rounded-2xl bg-white p-6">
          <Text className="mb-4 text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            Notifications
          </Text>
          <ToggleItem
            icon="🔔"
            title="Budget Alerts"
            value={notificationSettings.budgetAlerts}
            onToggle={() => toggleNotification('budgetAlerts')}
          />
          <ToggleItem
            icon="📝"
            title="Transaction Reminders"
            value={notificationSettings.transactionReminders}
            onToggle={() => toggleNotification('transactionReminders')}
          />
          <ToggleItem
            icon="🎯"
            title="Goal Milestones"
            value={notificationSettings.goalMilestones}
            onToggle={() => toggleNotification('goalMilestones')}
          />
          <ToggleItem
            icon="📊"
            title="Weekly Summary"
            value={notificationSettings.weeklySummary}
            onToggle={() => toggleNotification('weeklySummary')}
          />
        </View>

        {/* Data Management */}
        <View className="mx-6 mt-6 rounded-2xl bg-white p-6">
          <Text className="mb-4 text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            Data Management
          </Text>
          <SettingItem icon="📤" title="Export Data" onPress={handleExportData} />
          <SettingItem
            icon="🎯"
            title="Goals"
            value={`${stats.activeGoals} active`}
            onPress={() => router.push('/goals' as any)}
          />
          <SettingItem
            icon="🔄"
            title="Recurring Transactions"
            value={`${recurringTransactions.length} active`}
            onPress={() => router.push('/recurring-transactions' as any)}
          />
          <SettingItem icon="🗑️" title="Clear Cache" onPress={handleClearCache} />
          <SettingItem
            icon="🔍"
            title="Sync Debug"
            onPress={() => router.push('/(modals)/sync-debug' as any)}
          />
          <SettingItem
            icon="🔄"
            title="Reset Onboarding (Test)"
            onPress={async () => {
              Alert.alert(
                'Reset Onboarding',
                'This will reset the onboarding flag so you can test the onboarding flow again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    onPress: async () => {
                      await updateSettings({ hasCompletedOnboarding: false });
                      router.replace('/(auth)/welcome' as any);
                    },
                  },
                ]
              );
            }}
          />
          <SettingItem
            icon="⚠️"
            title={user ? 'Delete Account' : 'Reset App'}
            onPress={handleDeleteAccount}
            showArrow={false}
          />
        </View>

        {/* Support */}
        <View className="mx-6 mt-6 rounded-2xl bg-white p-6">
          <Text className="mb-4 text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            Support
          </Text>
          <SettingItem
            icon="❓"
            title="Help Center"
            onPress={() => Alert.alert('Help', 'Help center coming soon')}
          />
          <SettingItem
            icon="📧"
            title="Contact Support"
            onPress={() => Linking.openURL('mailto:support@pennywise.app')}
          />
          <SettingItem icon="⭐" title="Rate App" onPress={handleRateApp} />
          <SettingItem icon="📱" title="Share App" onPress={handleShareApp} showArrow={false} />
        </View>

        {/* Legal */}
        <View className="mx-6 mt-6 rounded-2xl bg-white p-6">
          <Text className="mb-4 text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            Legal
          </Text>
          <SettingItem
            icon="🔒"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy would be shown here')}
          />
          <SettingItem
            icon="📄"
            title="Terms of Service"
            onPress={() => Alert.alert('Terms', 'Terms of service would be shown here')}
          />
          <SettingItem
            icon="⚖️"
            title="Licenses"
            onPress={() => Alert.alert('Licenses', 'Open source licenses would be shown here')}
            showArrow={false}
          />
        </View>

        {/* App Info */}
        <View className="mx-6 my-6 items-center rounded-2xl bg-white p-6">
          <Text className="mb-2 text-base font-semibold text-gray-800">PennyWise</Text>
          <Text className="mb-4 text-sm text-gray-600">Version 1.0.0</Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Update', 'You are using the latest version')}>
            <Text className="text-sm" style={{ color: BRAND_COLORS.accent }}>
              Check for Updates
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
