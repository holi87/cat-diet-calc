import { FoodCategory } from '../types';

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  BASE: 'Baza',
  KIBBLE: 'Karma',
  WET_FOOD: 'Mokra',
  MEAT: 'Mięso',
  TREAT: 'Przysmak',
};

// Hex colors for Recharts charts
export const CATEGORY_CHART_COLORS: Record<FoodCategory, string> = {
  BASE: '#22c55e',     // green-500
  KIBBLE: '#b45309',   // amber-700
  WET_FOOD: '#3b82f6', // blue-500
  MEAT: '#ef4444',     // red-500
  TREAT: '#f97316',    // orange-500
};

// Tailwind classes for dots
export const CATEGORY_DOT_COLORS: Record<FoodCategory, string> = {
  BASE: 'bg-green-500',
  KIBBLE: 'bg-amber-700',
  WET_FOOD: 'bg-blue-500',
  MEAT: 'bg-red-500',
  TREAT: 'bg-orange-400',
};

// Tailwind classes for text badges
export const CATEGORY_BADGE_COLORS: Record<FoodCategory, string> = {
  BASE: 'text-green-700 bg-green-100',
  KIBBLE: 'text-amber-800 bg-amber-100',
  WET_FOOD: 'text-blue-700 bg-blue-100',
  MEAT: 'text-red-700 bg-red-100',
  TREAT: 'text-purple-700 bg-purple-100',
};

export const ALL_CATEGORIES: FoodCategory[] = ['BASE', 'KIBBLE', 'WET_FOOD', 'MEAT', 'TREAT'];
