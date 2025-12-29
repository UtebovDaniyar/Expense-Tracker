import { forwardRef, useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface NumberInputProps extends Omit<TextInputProps, 'keyboardType'> {
  label?: string;
  currencySymbol?: string;
  errorText?: string;
  showThousandSeparator?: boolean;
}

export const NumberInput = forwardRef<TextInput, NumberInputProps>(
  (
    {
      label,
      currencySymbol = '$',
      errorText,
      showThousandSeparator = true,
      value,
      onChangeText,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = !!errorText;

    const formatNumber = (text: string): string => {
      if (!showThousandSeparator) return text;

      // Remove non-numeric characters except decimal point
      const cleaned = text.replace(/[^0-9.]/g, '');

      // Split by decimal point
      const parts = cleaned.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1];

      // Add thousand separators
      const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      // Reconstruct with decimal part if exists
      return decimalPart !== undefined ? `${formatted}.${decimalPart}` : formatted;
    };

    const handleChangeText = (text: string) => {
      // Remove thousand separators for the actual value
      const cleanValue = text.replace(/,/g, '');
      onChangeText?.(cleanValue);
    };

    const displayValue = value ? formatNumber(value) : '';

    return (
      <View className={className}>
        {label && <Text className="mb-2 text-sm font-semibold text-gray-700">{label}</Text>}

        <View
          className="flex-row items-center rounded-2xl px-4 py-3"
          style={{
            backgroundColor: '#f5f5f5',
            borderWidth: isFocused ? 2 : 0,
            borderColor: hasError ? '#f44336' : BRAND_COLORS.accent,
          }}>
          <Text className="mr-2 text-lg" style={{ color: BRAND_COLORS.primary }}>
            {currencySymbol}
          </Text>
          <TextInput
            ref={ref}
            className="flex-1 text-base"
            value={displayValue}
            onChangeText={handleChangeText}
            keyboardType="decimal-pad"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor="#9e9e9e"
            {...props}
          />
        </View>

        {errorText && <Text className="mt-1 text-xs text-red-500">{errorText}</Text>}
      </View>
    );
  }
);

NumberInput.displayName = 'NumberInput';
