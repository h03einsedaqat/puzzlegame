import {
  applyWheelTouch,
  computeWheelGeometry,
  distanceBetween,
  getTileAtPoint,
  nearestTileId,
  resolveWheelTouch,
  type WheelGeometry,
} from '../../src/services/game/wheelGesture';

const tilesOf = (count: number, chars = 'کتا برمپز') =>
  Array.from({ length: count }, (_, index) => ({
    id: `t${index}`,
    char: chars[index] ?? '؟',
  }));

const geometryFor = (count: number, diameter = 300, tileSize = 48) =>
  computeWheelGeometry({ tiles: tilesOf(count), diameter, preferredTileSize: tileSize });

describe('هندسه چرخ', () => {
  it('حروف را از بالا و ساعتگرد دور دایره می‌چیند', () => {
    const geometry = geometryFor(4, 300, 48);
    const [first, second] = geometry.positions;
    // کاشی اول بالا و وسط است
    expect(first!.x).toBeCloseTo(150, 5);
    expect(first!.y).toBeLessThan(150);
    // کاشی دوم سمت راست کاشی اول است (چرخش ساعتگرد)
    expect(second!.x).toBeGreaterThan(first!.x);
  });

  it('ناحیه لمس دو کاشی همسایه هیچ‌وقت هم‌پوشانی ندارد', () => {
    for (const count of [4, 5, 6, 7, 8, 9]) {
      for (const diameter of [190, 220, 260, 300, 340]) {
        const geometry = geometryFor(count, diameter);
        // کوتاه‌ترین فاصله بین دو کاشی همسایه
        let minDistance = Number.POSITIVE_INFINITY;
        for (const a of geometry.positions) {
          for (const b of geometry.positions) {
            if (a.id === b.id) {
              continue;
            }
            minDistance = Math.min(minDistance, distanceBetween(a, b));
          }
        }
        expect(`n=${count} d=${diameter} :: ${geometry.touchRadius * 2 <= minDistance}`).toBe(
          `n=${count} d=${diameter} :: true`,
        );
      }
    }
  });

  it('روی چرخ کوچک، کاشی‌ها به‌جای هم‌پوشانی کوچک‌تر می‌شوند', () => {
    const geometry = geometryFor(9, 190, 48);
    expect(geometry.tileSize).toBeLessThanOrEqual(48);
    expect(geometry.tileSize).toBeGreaterThanOrEqual(30);
  });

  it('کاشی‌ها داخل چرخ می‌مانند', () => {
    const geometry = geometryFor(7, 240);
    for (const position of geometry.positions) {
      expect(position.x - geometry.tileSize / 2).toBeGreaterThanOrEqual(0);
      expect(position.x + geometry.tileSize / 2).toBeLessThanOrEqual(geometry.diameter);
      expect(position.y - geometry.tileSize / 2).toBeGreaterThanOrEqual(0);
      expect(position.y + geometry.tileSize / 2).toBeLessThanOrEqual(geometry.diameter);
    }
  });

  it('با صفر کاشی، هندسه خالی برمی‌گردد', () => {
    const geometry = computeWheelGeometry({ tiles: [], diameter: 300, preferredTileSize: 48 });
    expect(geometry.positions).toHaveLength(0);
    expect(nearestTileId(geometry, { x: 0, y: 0 })).toBeNull();
  });
});

describe('ضربه‌سنجی (Hit Test)', () => {
  const geometry = geometryFor(4, 300, 60);

  it('کاشی زیر انگشت را برمی‌گرداند', () => {
    const first = geometry.positions[0]!;
    expect(getTileAtPoint(geometry, { x: first.x + 2, y: first.y + 3 })).toBe(first.id);
  });

  it('داخل حاشیه لمس هر کاشی، خودِ همان کاشی انتخاب می‌شود', () => {
    for (const position of geometry.positions) {
      const point = { x: position.x + geometry.touchRadius - 1, y: position.y };
      expect(getTileAtPoint(geometry, point)).toBe(position.id);
    }
  });

  it('دور از همه کاشی‌ها هیچ حرفی انتخاب نمی‌شود', () => {
    expect(getTileAtPoint(geometry, { x: 5, y: 295 })).toBeNull();
    expect(nearestTileId(geometry, { x: 200, y: 200 })).toBeNull();
  });

  it('نقطه بین دو کاشی هیچ حرفی انتخاب نمی‌کند (نه نزدیک‌ترین)', () => {
    const a = geometry.positions[0]!;
    const b = geometry.positions[1]!;
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    expect(getTileAtPoint(geometry, middle)).toBeNull();
    expect(nearestTileId(geometry, middle)).toBeNull();
  });

  it('نوار بی‌طرف بین دو کاشی دست‌کم ۴ پوینت پهن است', () => {
    for (const count of [4, 5, 6, 7, 8, 9]) {
      for (const diameter of [190, 240, 300, 340]) {
        const wheel = geometryFor(count, diameter);
        // فاصله دو مرکز همسایه منهای دو ناحیه لمس = پهنای نوار بی‌طرف
        const band = wheel.neighbourDistance - 2 * wheel.touchRadius;
        expect(`n=${count} d=${diameter} :: ${band >= 4}`).toBe(`n=${count} d=${diameter} :: true`);
      }
    }
  });

  it('هر دو ناحیه لمس، دور از مرز مشترک تمام می‌شوند (بدون هم‌پوشانی با فاصله امن)', () => {
    const wheel = geometryFor(7, 300);
    expect(wheel.touchRadius * 2).toBeLessThanOrEqual(wheel.neighbourDistance - 2);
  });

  it('ناحیه لمس از کاشی دیداری بزرگ‌تر و از مرز همسایه کوچک‌تر است', () => {
    const wheel = geometryFor(5, 300, 40);
    expect(wheel.touchRadius).toBeGreaterThanOrEqual(wheel.tileSize / 2);
    expect(wheel.touchRadius).toBeLessThanOrEqual(wheel.neighbourDistance / 2);
    expect(wheel.touchRadius).toBeCloseTo(wheel.tileSize * 0.75, 5);
  });
});

describe('چرخ سه‌حرفی و دو‌حرفی', () => {
  it('در چرخ سه‌حرفی هم مرکز چرخ و هم بین دو حرف هیچ حرفی انتخاب نمی‌کند', () => {
    const wheel = geometryFor(3, 300);
    expect(getTileAtPoint(wheel, wheel.center)).toBeNull();
    const a = wheel.positions[0]!;
    const b = wheel.positions[1]!;
    expect(getTileAtPoint(wheel, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })).toBeNull();
  });

  it('در چرخ دو‌حرفی هیچ نقطه‌ای دو نامزد ندارد', () => {
    const wheel = geometryFor(2, 300);
    const [a, b] = wheel.positions;
    for (let t = 0; t <= 1; t += 0.01) {
      const point = { x: a!.x + (b!.x - a!.x) * t, y: a!.y + (b!.y - a!.y) * t };
      const first = getTileAtPoint(wheel, point);
      const second = getTileAtPoint(wheel, point);
      expect(first).toBe(second);
      if (first !== null && second !== null) {
        expect(first).toBe(second);
      }
    }
  });
});

describe('resolveWheelTouch', () => {
  it('کاشی تازه به انتخاب اضافه می‌شود', () => {
    expect(resolveWheelTouch(['a'], 'b')).toEqual({ type: 'add', tileId: 'b' });
  });

  it('برگشتن روی حرف یکی‌مانده‌قبل، آخرین حرف را برمی‌دارد', () => {
    expect(resolveWheelTouch(['a', 'b'], 'a')).toEqual({ type: 'remove', tileId: 'b' });
    expect(resolveWheelTouch(['a', 'b', 'c'], 'b')).toEqual({ type: 'remove', tileId: 'c' });
  });

  it('روی همان حرف آخر که انگشت ایستاده، کاری نمی‌کند', () => {
    expect(resolveWheelTouch(['a', 'b'], 'b')).toEqual({ type: 'none' });
  });

  it('روی حرف‌های قدیمی‌تر وسط زنجیره، انتخاب را به‌هم نمی‌ریزد', () => {
    expect(resolveWheelTouch(['a', 'b', 'c'], 'a')).toEqual({ type: 'none' });
    expect(resolveWheelTouch(['a', 'b', 'c', 'd'], 'b')).toEqual({ type: 'none' });
  });

  it('نبود کاشی یعنی هیچ', () => {
    expect(resolveWheelTouch(['a'], null)).toEqual({ type: 'none' });
  });
});

describe('applyWheelTouch', () => {
  it('حرف تکراری را دوبار اضافه نمی‌کند', () => {
    expect(applyWheelTouch(['a'], { type: 'add', tileId: 'a' })).toEqual(['a']);
  });

  it('برداشتن، ترتیب بقیه را نگه می‌دارد', () => {
    expect(applyWheelTouch(['a', 'b', 'c'], { type: 'remove', tileId: 'b' })).toEqual(['a', 'c']);
  });

  it('آرایه تازه می‌سازد تا React تغییر را ببیند', () => {
    const before = ['a'] as readonly string[];
    expect(applyWheelTouch(before, { type: 'add', tileId: 'b' })).not.toBe(before);
    expect(applyWheelTouch(before, { type: 'none' })).toBe(before);
  });

  it('حروف تکراری با شناسه مستقل، هر دو انتخاب می‌شوند', () => {
    const duplicates = ['t0', 't1'];
    const afterFirst = applyWheelTouch([], { type: 'add', tileId: duplicates[0]! });
    const afterSecond = applyWheelTouch(afterFirst, { type: 'add', tileId: duplicates[1]! });
    expect(afterSecond).toEqual(['t0', 't1']);
    expect(afterSecond).toHaveLength(2);
  });
});

describe('سازگاری نام قدیمی', () => {
  it('nearestTileId همان getTileAtPoint است', () => {
    const geometry: WheelGeometry = geometryFor(6, 300, 44);
    const position = geometry.positions[3]!;
    expect(nearestTileId(geometry, { x: position.x, y: position.y })).toBe(position.id);
  });
});
