import { forwardRef } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner = forwardRef<View, LoadingSpinnerProps>(
  ({ size = 'large', color = BRAND_COLORS.primary, text, fullScreen = false, className }, ref) => {
    const content = (
      <>
        <ActivityIndicator size={size} color={color} />
        {text && <Text className="mt-3 text-sm text-gray-600">{text}</Text>}
      </>
    );

    if (fullScreen) {
      return (
        <View
          ref={ref}
          className="absolute inset-0 items-center justify-center bg-white"
          style={{ zIndex: 9999 }}>
          {content}
        </View>
      );
    }

    return (
      <View ref={ref} className={`items-center justify-center ${className}`}>
        {content}
      </View>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';
