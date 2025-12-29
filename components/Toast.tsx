import { forwardRef, useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  visible: boolean;
  onHide?: () => void;
  position?: 'top' | 'bottom';
  className?: string;
}

export const Toast = forwardRef<View, ToastProps>(
  (
    { message, type = 'info', duration = 3000, visible, onHide, position = 'top', className },
    ref
  ) => {
    const [opacity] = useState(new Animated.Value(0));

    useEffect(() => {
      if (visible) {
        // Fade in
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Auto hide after duration
        const timer = setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            onHide?.();
          });
        }, duration);

        return () => clearTimeout(timer);
      }
    }, [visible, duration, opacity, onHide]);

    const getBackgroundColor = () => {
      switch (type) {
        case 'success':
          return BRAND_COLORS.success;
        case 'error':
          return '#f44336';
        case 'warning':
          return '#ff9800';
        default:
          return BRAND_COLORS.primary;
      }
    };

    const getIcon = () => {
      switch (type) {
        case 'success':
          return '✓';
        case 'error':
          return '✕';
        case 'warning':
          return '⚠';
        default:
          return 'ℹ';
      }
    };

    if (!visible) return null;

    return (
      <Animated.View
        ref={ref}
        className={`absolute left-4 right-4 z-50 flex-row items-center rounded-2xl p-4 shadow-lg ${className}`}
        style={{
          backgroundColor: getBackgroundColor(),
          opacity,
          [position]: 60,
        }}>
        <View
          className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white"
          style={{ opacity: 0.9 }}>
          <Text className="text-lg font-bold" style={{ color: getBackgroundColor() }}>
            {getIcon()}
          </Text>
        </View>

        <Text className="flex-1 text-base font-semibold text-white">{message}</Text>
      </Animated.View>
    );
  }
);

Toast.displayName = 'Toast';
