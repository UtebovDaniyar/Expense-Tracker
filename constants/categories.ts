import { CategoryConfig } from '@/types/models';

export const CATEGORIES: CategoryConfig[] = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#FF6B6B' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#4ECDC4' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#95E1D3' },
  { id: 'bills', name: 'Bills', icon: '📄', color: '#F38181' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#AA96DA' },
  { id: 'health', name: 'Health', icon: '🏥', color: '#FCBAD3' },
  { id: 'education', name: 'Education', icon: '📚', color: '#A8D8EA' },
  { id: 'other', name: 'Other', icon: '➕', color: '#C7CEEA' },
];

export const getCategoryConfig = (categoryId: string): CategoryConfig | undefined => {
  return CATEGORIES.find((cat) => cat.id === categoryId);
};
