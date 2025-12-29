import { forwardRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  onClear?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      helperText,
      errorText,
      showCharacterCount,
      maxLength,
      onClear,
      value,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = !!errorText;
    const showClearButton = !!value && !!onClear && isFocused;

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
          <TextInput
            ref={ref}
            className="flex-1 text-base"
            value={value}
            maxLength={maxLength}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor="#9e9e9e"
            {...props}
          />

          {showClearButton && (
            <TouchableOpacity onPress={onClear} className="ml-2">
              <Text className="text-lg text-gray-500">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {(helperText || errorText || showCharacterCount) && (
          <View className="mt-1 flex-row justify-between">
            <Text className={`text-xs ${hasError ? 'text-red-500' : 'text-gray-600'}`}>
              {errorText || helperText || ''}
            </Text>
            {showCharacterCount && maxLength && (
              <Text className="text-xs text-gray-600">
                {value?.length || 0}/{maxLength}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
