import type { ViewStyle } from 'react-native';

/**
 * سایه‌های سبک و رنگی. روی Android از elevation استفاده می‌شود تا سایه‌های سنگین
 * باعث افت فریم در انیمیشن نشوند؛ رنگ سایه کمی بنفش/آبی است تا با پالت شاد
 * برنامه هم‌خوان باشد و مثل دود خاکستری به‌نظر نرسد.
 */
export const shadows: Record<'none' | 'soft' | 'card' | 'raised' | 'tile', ViewStyle> = {
  none: {},
  soft: {
    shadowColor: '#3A4A8F',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    shadowColor: '#3A4A8F',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  raised: {
    shadowColor: '#3A4A8F',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tile: {
    shadowColor: '#4E2C12',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
};
