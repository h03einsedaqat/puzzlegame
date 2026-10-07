/**
 * هندسه و ضربه‌سنجی چرخ حروف (Hit Testing).
 *
 * این فایل کاملاً خالص است: نه React، نه Gesture Handler و نه اندازه‌گیری صفحه.
 * همه محاسبه‌ها در «مختصات چرخ» انجام می‌شود؛ یعنی نقطه‌ای که لایه اشاره
 * می‌دهد (`x`/`y` نسبت به خود چرخ) با مختصات مرکز کاشی‌ها یکی است. دلیلش این
 * است که روی اندروید `pageX/pageY` نسبت به ریشه نمای برنامه است و
 * `measureInWindow` نسبت به پنجره؛ تفاوت این دو باعث می‌شد مسیر انتخاب و
 * ضربه‌سنجی با انگشت هم‌خوان نباشد. با استفاده از مختصات نسبی، هیچ اندازه‌گیری
 * غیرهمگام (`measureInWindow`) در مسیر لمس لازم نیست.
 */

export interface WheelPoint {
  x: number;
  y: number;
}

export interface WheelTilePosition {
  id: string;
  /** حرف این کاشی؛ برای ساخت مسیر و آزمون‌ها نگه داشته می‌شود */
  char: string;
  x: number;
  y: number;
}

/** حداقل و حداکثر اندازه کاشی حرف؛ کوچک‌تر از این لمس‌کردن سخت می‌شود. */
export const MIN_WHEEL_TILE_SIZE = 34;
export const MAX_WHEEL_TILE_SIZE = 64;
/** فاصله کمینه بین دو کاشی همسایه، به‌نسبت اندازه کاشی (۲۵٪). */
const MIN_NEIGHBOUR_GAP_RATIO = 0.25;
/** فاصله کاشی‌ها از لبه چرخ (پوینت). */
const WHEEL_EDGE_PADDING = 4;
/**
 * شعاع ناحیه لمس، به‌نسبت اندازه کاشی: ۷۵٪ اندازه کاشی، یعنی ۱.۵ برابر شعاع
 * دیداری. دلیل اینکه ناحیه لمس از خود کاشی بزرگ‌تر است: انگشت انسان نقطه‌ای
 * دقیق نیست و روی گوشی، کمی خطا همیشه هست؛ ولی این بزرگ‌شدن هرگز باعث
 * هم‌پوشانی دو کاشی نمی‌شود (قید پایین‌تر).
 */
const HIT_RADIUS_RATIO = 0.75;
/**
 * فاصله امن از «مرز مشترک» دو کاشی همسایه (پوینت). با این مقدار، پهنای کل
 * نوار بی‌طرف دست‌کم ۴ پوینت می‌شود؛ بزرگ‌تر از لرزش معمول انگشت روی صفحه.
 *
 * مرز مشترک، نیمه راه بین دو مرکز است. ناحیه لمس هیچ‌وقت از این مرز نمی‌گذرد؛
 * پس روی خودِ مرز و نوار باریک اطرافش هیچ کاشی‌ای نامزد نیست و نتیجه `null`
 * است. یعنی «انگشت بین دو حرف» هیچ‌وقت به‌صورت تصادفی یکی از دو حرف را
 * انتخاب نمی‌کند؛ انتخاب دست‌نخورده می‌ماند تا انگشت واضحاً وارد یک حرف شود.
 */
const BISECTOR_MARGIN = 2;

export interface WheelGeometryInput {
  tiles: readonly { id: string; char: string }[];
  /** قطر چرخ (پوینت) */
  diameter: number;
  /** اندازه کاشی پیشنهادی؛ نتیجه هرگز از این بزرگ‌تر نمی‌شود */
  preferredTileSize?: number;
  minTileSize?: number;
  maxTileSize?: number;
}

export interface WheelGeometry {
  diameter: number;
  center: WheelPoint;
  /** شعاع دایره‌ای که مرکز کاشی‌ها روی آن می‌نشیند */
  orbit: number;
  /** اندازه نهایی کاشی‌ها (ممکن است از پیشنهاد کوچک‌تر شده باشد) */
  tileSize: number;
  /** ناحیه لمس هر کاشی؛ هرگز با همسایه‌اش هم‌پوشانی ندارد */
  touchRadius: number;
  /** فاصله مرکز هر دو کاشی همسایه؛ برای آزمون‌های هندسی */
  neighbourDistance: number;
  positions: readonly WheelTilePosition[];
}

export const EMPTY_WHEEL_GEOMETRY: WheelGeometry = {
  diameter: 0,
  center: { x: 0, y: 0 },
  orbit: 0,
  tileSize: MIN_WHEEL_TILE_SIZE,
  touchRadius: 0,
  neighbourDistance: 0,
  positions: [],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** اندازه کاشی پیشنهادی بر پایه قطر چرخ و تعداد حروف */
export function preferredTileSizeFor(diameter: number, count: number): number {
  const ratio = count <= 5 ? 0.24 : count <= 7 ? 0.21 : 0.185;
  return clamp(Math.round(diameter * ratio), MIN_WHEEL_TILE_SIZE, MAX_WHEEL_TILE_SIZE);
}

/**
 * چیدن حروف روی دایره.
 *
 * ترتیب از بالا و ساعتگرد است تا با جهت خواندن فارسی روی چرخ طبیعی بماند.
 * اندازه کاشی و شعاع دایره طوری حساب می‌شوند که فاصله مرکز دو کاشی همسایه
 * دست‌کم `tileSize × (۱ + ۲۵٪)` باشد؛ همین شرط تضمین می‌کند ناحیه لمس کاشی‌ها
 * هیچ‌وقت روی هم نیفتد و انتخاب بین دو حرف تصادفی نشود.
 */
export function computeWheelGeometry(input: WheelGeometryInput): WheelGeometry {
  const { tiles, diameter } = input;
  const count = tiles.length;
  if (count === 0 || diameter <= 0) {
    return { ...EMPTY_WHEEL_GEOMETRY, diameter: Math.max(0, diameter) };
  }

  const minTile = input.minTileSize ?? MIN_WHEEL_TILE_SIZE;
  const maxTile = input.maxTileSize ?? MAX_WHEEL_TILE_SIZE;
  const requested = input.preferredTileSize ?? preferredTileSizeFor(diameter, count);
  const preferred = clamp(Math.round(requested), minTile, maxTile);

  const step = (2 * Math.PI) / count;
  const chordFor = (orbit: number) => (count === 1 ? Number.POSITIVE_INFINITY : 2 * orbit * Math.sin(step / 2));
  const orbitFor = (tile: number) => Math.max(tile * 0.6, diameter / 2 - tile / 2 - WHEEL_EDGE_PADDING);

  // گام ۱: با اندازه پیشنهادی، شعاع دایره و بزرگ‌ترین کاشی ممکن را حساب کن.
  const orbitAtPreferred = orbitFor(preferred);
  const chordAtPreferred = chordFor(orbitAtPreferred);
  const maxByChord = Math.floor(chordAtPreferred / (1 + MIN_NEIGHBOUR_GAP_RATIO));
  const tileSize = clamp(Math.min(preferred, maxByChord), Math.min(minTile, preferred), maxTile);

  // گام ۲: با کاشی نهایی شعاع را دوباره حساب کن (کاشی کوچک‌تر جای بیشتری می‌دهد).
  const orbit = orbitFor(tileSize);
  const neighbourDistance = chordFor(orbit);

  // ناحیه لمس: بزرگ‌تر از خود کاشی، ولی هرگز از نیمه راه تا همسایه نمی‌گذرد.
  // چون فاصله دو کاشی همسایه دست‌کم `tileSize × ۱.۲۵` است، این فرمول همیشه
  // از شعاع دیداری (نصف کاشی) بزرگ‌تر یا مساوی درمی‌آید و هیچ‌وقت دو ناحیه
  // روی هم نمی‌افتند.
  const halfNeighbour = Number.isFinite(neighbourDistance)
    ? neighbourDistance / 2 - BISECTOR_MARGIN
    : Number.POSITIVE_INFINITY;
  const touchRadius = Math.max(
    tileSize / 2,
    Math.min(tileSize * HIT_RADIUS_RATIO, halfNeighbour),
  );

  const positions: WheelTilePosition[] = tiles.map((tile, index) => {
    const angle = -Math.PI / 2 + index * step;
    return {
      id: tile.id,
      char: tile.char,
      x: diameter / 2 + orbit * Math.cos(angle),
      y: diameter / 2 + orbit * Math.sin(angle),
    };
  });

  return {
    diameter,
    center: { x: diameter / 2, y: diameter / 2 },
    orbit,
    tileSize,
    touchRadius,
    neighbourDistance: Number.isFinite(neighbourDistance) ? neighbourDistance : orbit * 2,
    positions,
  };
}

/** فاصله دو نقطه */
export function distanceBetween(a: WheelPoint, b: WheelPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** مرکز یک کاشی بر پایه شناسه‌اش */
export function positionOf(geometry: WheelGeometry, tileId: string): WheelTilePosition | undefined {
  return geometry.positions.find(position => position.id === tileId);
}

/**
 * کاشی زیر انگشت، اگر انگشت واقعاً داخل ناحیه لمس آن باشد.
 *
 * قاعده‌ها:
 *   ۱) فقط کاشی‌ای نامزد است که انگشت داخل ناحیه لمسش باشد؛ صرفِ «نزدیک‌ترین
 *      بودن» کافی نیست.
 *   ۲) ناحیه‌های لمس کاشی‌های همسایه هیچ‌وقت روی هم نمی‌افتند (مرز مشترکشان
 *      نیمه راه است و ناحیه لمس از آن رد نمی‌شود). پس در هر نقطه حداکثر یک
 *      کاشی نامزد است و نتیجه قطعی است؛ هیچ‌وقت بین دو حرف «نوسان» نمی‌کنیم.
 *   ۳) روی نوار مرزی بین دو کاشی هیچ نامزدی نیست و نتیجه `null` است؛ `null`
 *      یعنی «انتخاب را دست نزن»، پس انگشت در فاصله بین دو حرف هیچ حرف اشتباهی
 *      اضافه نمی‌کند و زنجیره هم نمی‌شکند.
 */
export function getTileAtPoint(geometry: WheelGeometry, point: WheelPoint): string | null {
  for (const position of geometry.positions) {
    if (distanceBetween(position, point) <= geometry.touchRadius) {
      return position.id;
    }
  }
  return null;
}

/**
 * سازگاری با نام قدیمی: نزدیک‌ترین کاشی داخل ناحیه لمس.
 * دقت کن که این تابع دیگر «همیشه نزدیک‌ترین» را برنمی‌گرداند؛ اگر انگشت بیرون
 * ناحیه‌ها باشد `null` می‌دهد (همان چیزی که آزمون «بین دو کاشی» می‌سنجد).
 */
export function nearestTileId(geometry: WheelGeometry, point: WheelPoint): string | null {
  return getTileAtPoint(geometry, point);
}

/** چیزی که لمس یک نقطه روی چرخ باید انجام دهد */
export type WheelTouchAction =
  | { type: 'add'; tileId: string }
  | { type: 'remove'; tileId: string }
  | { type: 'none' };

/**
 * تصمیم کشیدن انگشت روی یک کاشی.
 *
 * - کاشی تازه → به انتخاب اضافه می‌شود.
 * - برگشتن روی کاشی «یکی‌مانده‌قبل» → آخرین حرف برداشته می‌شود (اصلاح اشتباه
 *   بدون رهاکردن انگشت؛ استاندارد چرخ‌های کلمه).
 * - کاشی‌های قدیمی‌تر وسط زنجیره → هیچ‌چیز (رفتار قطعی، نه تصادفی).
 * - نبود کاشی (`null`) → هیچ‌چیز؛ زنجیره نمی‌شکند.
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
