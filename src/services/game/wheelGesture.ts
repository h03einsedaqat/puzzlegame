export interface WheelPoint {
  x: number;
  y: number;
}

export interface WheelTilePosition {
  id: string;
  x: number;
  y: number;
}

/** چیزی که لمس یک نقطه روی چرخ باید انجام دهد */
export type WheelTouchAction =
  | { type: 'add'; tileId: string }
  | { type: 'remove'; tileId: string }
  | { type: 'none' };

/**
 * نزدیک‌ترین کاشی به انگشت، اگر داخل محدوده لمس باشد.
 *
 * محدوده لمس کمی بزرگ‌تر از خود کاشی است (`hitFactor`) تا روی گوشی، انگشت به‌سادگی
 * کاشی بعدی را بگیرد؛ همان حس بازی‌های کلمه‌ای. اگر انگشت روی هیچ کاشی نبود،
 * `null` برمی‌گردد تا زنجیره انتخاب نشکند (کشیدن از حاشیه بی‌اثر است).
 */
export function nearestTileId(
  positions: readonly WheelTilePosition[],
  tileSize: number,
  point: WheelPoint,
  hitFactor = 0.95,
): string | null {
  const reach = Math.max(12, tileSize * hitFactor);
  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const position of positions) {
    const distance = Math.hypot(position.x - point.x, position.y - point.y);
    if (distance < reach && distance < bestDistance) {
      bestDistance = distance;
      bestId = position.id;
    }
  }

  return bestId;
}

/**
 * تصمیم کشیدن انگشت روی یک کاشی.
 *
 * - کاشی تازه → به انتخاب اضافه می‌شود.
 * - برگشتن روی کاشی «یکی‌مانده‌قبل» → آخرین حرف برداشته می‌شود (اصلاح اشتباه
 *   بدون رهاکردن انگشت؛ همان کاری که بازیکن انتظار دارد).
 * - کاشی‌های دیگر → هیچ‌چیز.
 */
export function resolveWheelTouch(
  selection: readonly string[],
  tileId: string | null,
): WheelTouchAction {
  if (tileId === null) {
    return { type: 'none' };
  }
  const index = selection.indexOf(tileId);
  if (index === -1) {
    return { type: 'add', tileId };
  }
  const lastIndex = selection.length - 1;
  if (index === lastIndex - 1) {
    return { type: 'remove', tileId: selection[lastIndex] as string };
  }
  return { type: 'none' };
}

/**
 * اعمال نتیجه لمس روی انتخاب و برگرداندن آرایه تازه.
 * خالص است تا هم در حلقه لمس (بدون انتظار برای رندر) و هم در آزمون قابل استفاده باشد.
 */
export function applyWheelTouch(
  selection: readonly string[],
  action: WheelTouchAction,
): readonly string[] {
  if (action.type === 'add') {
    return selection.includes(action.tileId) ? selection : [...selection, action.tileId];
  }
  if (action.type === 'remove') {
    const index = selection.indexOf(action.tileId);
    return index === -1 ? selection : selection.filter((_, position) => position !== index);
  }
  return selection;
}
