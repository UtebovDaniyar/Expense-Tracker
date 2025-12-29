import { forwardRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface SwitchProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch = forwardRef<View, SwitchProps>(
  ({ label, value, onValueChange, disabled = false, className }, ref) => {
    return (
      <View ref={ref} className={`flex-row items-center justify-between ${className}`}>
        {label && <Text className="flex-1 text-base text-gray-800">{label}</Text>}

        <TouchableOpacity
          className="h-8 w-14 justify-center rounded-full"
          style={{
            backgroundColor: value ? BRAND_COLORS.success : '#e0e0e0',
            opacity: disabled ? 0.5 : 1,
          }}
          onPress={() => !disabled && onValueChange(!value)}
          disabled={disabled}
          accessible={true}
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled }}
          accessibilityLabel={label}>
          <View
            className="h-6 w-6 rounded-full bg-white shadow-md"
            style={{
              marginLeft: value ? 28 : 4,
              transform: [{ translateX: 0 }],
            }}
          />
        </TouchableOpacity>
      </View>
    );
  }
);

Switch.displayName = 'Switch';
