import { useSettings } from '../context';

/**
 * آیا کاربر انیمیشن‌های سبک‌تر می‌خواهد؟
 *
 * تنظیم «کاهش انیمیشن» در صفحه تنظیمات است و انیمیشن‌های بازی آن را رعایت
 * می‌کنند تا برای کاربران حساس به حرکت، تجربه آرام‌تری ساخته شود.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSettings();
  return settings.reducedMotion;
}
