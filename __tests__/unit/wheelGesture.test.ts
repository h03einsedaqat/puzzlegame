import {
  applyWheelTouch,
  nearestTileId,
  resolveWheelTouch,
} from '../../src/services/game/wheelGesture';

const positions = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 50, y: 0 },
  { id: 'c', x: 100, y: 0 },
];

describe('nearestTileId', () => {
  it('کاشی نزدیک انگشت را برمی‌گرداند', () => {
    expect(nearestTileId(positions, 50, { x: 52, y: 4 })).toBe('b');
  });

  it('نزدیک‌ترین را انتخاب می‌کند، نه اولین را', () => {
    expect(nearestTileId(positions, 50, { x: 96, y: 0 })).toBe('c');
    expect(nearestTileId(positions, 50, { x: 4, y: 0 })).toBe('a');
  });

  it('دور از همه کاشی‌ها چیزی برنمی‌گرداند تا زنجیره انتخاب نشکند', () => {
    expect(nearestTileId(positions, 50, { x: 200, y: 200 })).toBeNull();
  });
});

describe('resolveWheelTouch', () => {
  it('کاشی تازه به انتخاب اضافه می‌شود', () => {
    expect(resolveWheelTouch(['a'], 'b')).toEqual({ type: 'add', tileId: 'b' });
  });

  it('برگشتن روی حرف یکی‌مانده‌قبل، آخرین حرف را برمی‌دارد', () => {
    expect(resolveWheelTouch(['a', 'b'], 'a')).toEqual({ type: 'remove', tileId: 'b' });
  });

  it('روی همان حرف آخر که انگشت ایستاده، کاری نمی‌کند', () => {
    expect(resolveWheelTouch(['a', 'b'], 'b')).toEqual({ type: 'none' });
  });

  it('روی حرف‌های قدیمی‌تر وسط زنجیره، انتخاب را به‌هم نمی‌ریزد', () => {
    expect(resolveWheelTouch(['a', 'b', 'c'], 'a')).toEqual({ type: 'none' });
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
});
