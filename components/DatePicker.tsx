import { forwardRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { BRAND_COLORS } from '@/constants/colors';

interface DatePickerProps {
  label?: string;
  value?: string; // ISO date string
  onChange: (date: string) => void;
  placeholder?: string;
  errorText?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

export const DatePicker = forwardRef<View, DatePickerProps>(
  (
    { label, value, onChange, placeholder = 'Select date', errorText, className, minDate, maxDate },
    ref
  ) => {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState(value || '');
    const hasError = !!errorText;

    const formatDisplayDate = (dateString: string): string => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const handleConfirm = () => {
      if (tempDate) {
        onChange(tempDate);
      }
      setShowPicker(false);
    };

    const getQuickDates = () => {
      const today = new Date();
      return [
        { label: 'Today', date: today.toISOString().split('T')[0] },
        {
          label: 'Tomorrow',
          date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          label: 'Next Week',
          date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          label: 'Next Month',
          date: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
            .toISOString()
            .split('T')[0],
        },
      ];
    };

    return (
      <View ref={ref} className={className}>
        {label && <Text className="mb-2 text-sm font-semibold text-gray-700">{label}</Text>}

        <TouchableOpacity
          className="flex-row items-center rounded-2xl px-4 py-3"
          style={{
            backgroundColor: '#f5f5f5',
            borderWidth: hasError ? 2 : 0,
            borderColor: '#f44336',
          }}
          onPress={() => setShowPicker(true)}>
          <Text className="mr-2 text-lg">📅</Text>
          <Text className="flex-1 text-base" style={{ color: value ? '#212121' : '#9e9e9e' }}>
            {value ? formatDisplayDate(value) : placeholder}
          </Text>
        </TouchableOpacity>

        {errorText && <Text className="mt-1 text-xs text-red-500">{errorText}</Text>}

        {/* Date Picker Modal */}
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="rounded-t-3xl bg-white p-6">
              <View className="mb-4 items-center">
                <View className="h-1 w-10 rounded-full bg-gray-300" />
              </View>

              <Text className="mb-4 text-xl font-bold" style={{ color: BRAND_COLORS.primary }}>
                Select Date
              </Text>

              {/* Quick Select Buttons */}
              <View className="mb-4">
                <Text className="mb-2 text-sm text-gray-600">Quick Select:</Text>
                <View className="flex-row flex-wrap">
                  {getQuickDates().map((quick) => (
                    <TouchableOpacity
                      key={quick.label}
                      className="mb-2 mr-2 rounded-full px-4 py-2"
                      style={{ backgroundColor: BRAND_COLORS.accent + '20' }}
                      onPress={() => {
                        setTempDate(quick.date);
                        onChange(quick.date);
                        setShowPicker(false);
                      }}>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: BRAND_COLORS.primary }}>
                        {quick.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Manual Date Input */}
              <View className="mb-4">
                <Text className="mb-2 text-sm text-gray-600">Or enter date:</Text>
                <TextInput
                  className="rounded-2xl px-4 py-3"
                  style={{ backgroundColor: '#f5f5f5' }}
                  placeholder="YYYY-MM-DD"
                  value={tempDate}
                  onChangeText={setTempDate}
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row">
                <TouchableOpacity
                  className="mr-2 flex-1 items-center rounded-full py-4"
                  style={{ backgroundColor: '#e8f5e9' }}
                  onPress={() => setShowPicker(false)}>
                  <Text className="font-semibold" style={{ color: BRAND_COLORS.primary }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center rounded-full py-4"
                  style={{ backgroundColor: BRAND_COLORS.primary }}
                  onPress={handleConfirm}>
                  <Text className="font-semibold text-white">Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
);

DatePicker.displayName = 'DatePicker';
