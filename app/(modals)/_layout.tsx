import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}>
      <Stack.Screen name="add-transaction" />
      <Stack.Screen name="transaction-filters" />
    </Stack>
  );
}
