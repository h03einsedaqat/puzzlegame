/**
 * لاگ‌گیری محدود برای اشکال‌زدایی تعامل.
 *
 * فقط در نسخه توسعه چاپ می‌کند (`__DEV__`)، پس در بسته انتشار هیچ خروجی
 * کنسولی تولید نمی‌شود. رویدادهای پرتعداد (حرکت انگشت) عمداً لاگ نمی‌شوند تا
 * کنسول پر نشود؛ تنها شروع/پایان حرکت، لغو و ثبت واژه ثبت می‌شود.
 */
export function devLog(event: string, params?: Record<string, unknown>): void {
  if (!__DEV__) {
    return;
  }
  if (params) {
    console.log(`[kalamesaz] ${event}`, params);
    return;
  }
  console.log(`[kalamesaz] ${event}`);
}
