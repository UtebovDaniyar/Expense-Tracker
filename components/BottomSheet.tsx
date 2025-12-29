import { forwardRef, ReactNode } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  maxHeight?: number | string;
  className?: string;
}

export const BottomSheet = forwardRef<View, BottomSheetProps>(
  (
    { visible, onClose, title, children, showCloseButton = true, maxHeight = '90%', className },
    ref
  ) => {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={onClose}>
          <Pressable
            ref={ref}
            className={`rounded-t-3xl bg-white p-6 ${className}`}
            style={{ maxHeight: maxHeight as any }}
            onPress={(e) => e.stopPropagation()}>
            {/* Drag Handle */}
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>

            {/* Header */}
            {(title || showCloseButton) && (
              <View className="mb-4 flex-row items-center justify-between">
                {title && (
                  <Text
                    className="flex-1 text-2xl font-bold"
                    style={{ color: BRAND_COLORS.primary }}>
                    {title}
                  </Text>
                )}
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={onClose}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Close">
                    <Text className="text-2xl text-gray-500">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';
