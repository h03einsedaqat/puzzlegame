import type { ViewStyle } from 'react-native';

/** سایه‌های سرد و کم‌هزینه؛ عمق اصلی سطوح با border/contrast ساخته می‌شود. */
export const shadows: Record<'none' | 'soft' | 'card' | 'raised' | 'tile', ViewStyle> = {
  none: {},
  soft: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  card: {
    shadowColor: '#03050D',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  raised: {
    shadowColor: '#02040B',
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
  },
  tile: {
    shadowColor: '#02040B',
    shadowOpacity: 0.38,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
};
