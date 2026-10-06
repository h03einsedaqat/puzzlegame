import type { ViewStyle } from 'react-native';

/**
 * سایه‌های سبک. روی Android از elevation استفاده می‌شود تا سایه‌های سنگین
 * باعث افت فریم در انیمیشن نشوند.
 */
export const shadows: Record<'none' | 'soft' | 'card' | 'raised' | 'tile', ViewStyle> = {
  none: {},
  soft: {
    shadowColor: '#3A2F99',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    shadowColor: '#3A2F99',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#3A2F99',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tile: {
    shadowColor: '#7A6F5B',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
};
