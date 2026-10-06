export type WordCategory =
  | 'طبیعت'
  | 'حیوانات'
  | 'خانه'
  | 'خانواده'
  | 'خوراکی'
  | 'پوشاک'
  | 'مدرسه'
  | 'دانشگاه'
  | 'شغل'
  | 'فناوری'
  | 'سفر'
  | 'شهر'
  | 'مکان'
  | 'اشیا'
  | 'ورزش'
  | 'بدن'
  | 'افعال'
  | 'صفت‌ها'
  | 'زمان'
  | 'عمومی';

/**
 * سطح واژه:
 * - basic: واژه‌های پرکاربرد و بی‌ابهام؛ مناسب واژه‌های اصلی مرحله
 * - extended: واژه‌های درست اما کمی کم‌کاربردتر؛ مناسب واژه‌های امتیازی
 */
export type WordTier = 'basic' | 'extended';

export interface WordEntry {
  word: string;
  category: WordCategory;
  tier: WordTier;
}
