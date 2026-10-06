import { useWindowDimensions } from 'react-native';

const REFERENCE_WIDTH = 375;

export interface LayoutMetrics {
  width: number;
  height: number;
  isSmall: boolean;
  isTablet: boolean;
  /** حداکثر عرض محتوا؛ روی تبلت جلوی کشیده‌شدن بی‌قاعده را می‌گیرد */
  contentMaxWidth: number;
  /** اندازه کاشی حروف با توجه به عرض صفحه و تعداد حروف مرحله */
  tileSize: (letterCount: number, tilesPerRow: number) => number;
}

export function getLayoutMetrics(width: number, height: number): LayoutMetrics {
  const shortest = Math.min(width, height);
  const isTablet = shortest >= 600;
  const isSmall = shortest < 360;
  const contentMaxWidth = isTablet ? 620 : width;

  const tileSize = (letterCount: number, tilesPerRow: number) => {
    const available = Math.min(width, contentMaxWidth) - 32;
    const gaps = (tilesPerRow - 1) * 10;
    const byRow = Math.floor((available - gaps) / tilesPerRow);
    const byCount = Math.floor(available / Math.max(letterCount, tilesPerRow));
    const size = Math.min(72, Math.max(48, Math.min(byRow, Math.max(byCount, 52))));
    return isSmall ? Math.max(46, size - 4) : size;
  };

  return { width, height, isSmall, isTablet, contentMaxWidth, tileSize };
}

export function useLayout(): LayoutMetrics {
  const { width, height } = useWindowDimensions();
  return getLayoutMetrics(width, height);
}

/** مقیاس‌دهی نرم بر پایه عرض مرجع؛ برای اندازه‌های ثابت و غیرمنطقی نیست. */
export function scaleSize(size: number, width: number): number {
  const ratio = Math.min(Math.max(width / REFERENCE_WIDTH, 0.9), 1.35);
  return Math.round(size * ratio);
}
