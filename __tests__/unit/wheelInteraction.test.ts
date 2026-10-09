import {
  computeWheelGeometry,
  type WheelGeometry,
  type WheelPoint,
} from '../../src/services/game/wheelGesture';
import {
  adoptSelection,
  createWheelInteractionState,
  wheelGestureCancel,
  wheelGestureDown,
  wheelGestureEnd,
  wheelGestureMove,
  type WheelInteractionState,
} from '../../src/services/game/wheelInteraction';

/**
 * آزمون‌های ماشین حالت لمس چرخ.
 *
 * این آزمون‌ها همان سناریوهایی هستند که روی گوشی واقعی دیده می‌شوند:
 * `fingerDown(A)`, `move(B)`, `move(C)`, `fingerUp` و گونه‌های آن. چون ماشین
 * حالت خالص است، هر سناریو دقیقاً و بدون زمان‌بندی شبیه‌سازی می‌شود.
 */

const chars = 'کتا برمپز';
const tiles = Array.from({ length: 6 }, (_, index) => ({ id: `t${index}`, char: chars[index]! }));
const geometry: WheelGeometry = computeWheelGeometry({ tiles, diameter: 300, preferredTileSize: 52 });

const at = (tileId: string): WheelPoint => {
  const position = geometry.positions.find(candidate => candidate.id === tileId);
  if (!position) {
    throw new Error(`کاشی ${tileId} در هندسه آزمون نیست.`);
  }
  return { x: position.x, y: position.y };
};

/** نقطه‌ای که دقیقاً وسط ناحیه لمس کاشی است، ولی کمی جابه‌جا تا حرکت واقعی شبیه شود */
const inside = (tileId: string): WheelPoint => {
  const point = at(tileId);
  return { x: point.x + 1, y: point.y + 1 };
};

const between = (a: string, b: string): WheelPoint => {
  const first = at(a);
  const second = at(b);
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
};

interface DragTrace {
  /** انتخاب نهایی که هنگام برداشتن انگشت ثبت می‌شود */
  released: readonly string[] | null;
  /** همه تغییرهایی که در طول کشیدن نوشته شده‌اند */
  changes: readonly (readonly string[])[];
  dragStarted: boolean;
}

/**
 * انگشت را از میان چند کاشی می‌کشد.
 * در مسیر هر دو کاشی، یک نمونه «وسط فاصله» هم فرستاده می‌شود تا حرکت واقعی
 * انگشت (که از حاشیه‌ها می‌گذرد) شبیه‌سازی شود.
 */
function drag(tileIds: readonly string[], startFrom: readonly string[] = []): DragTrace {
  const first = tileIds[0];
  if (first === undefined) {
    throw new Error('سناریوی کشیدن دست‌کم به یک کاشی نیاز دارد.');
  }

  let state: WheelInteractionState = wheelGestureDown(geometry, startFrom, inside(first)).state;
  const changes: (readonly string[])[] = [];
  let dragStarted = false;

  const push = (selection: readonly string[] | null) => {
    if (selection) {
      changes.push(selection);
    }
  };

  for (const tileId of tileIds.slice(1)) {
    const previous = state.activeTileId;
    if (previous && previous !== tileId) {
      const gapResult = wheelGestureMove(state, geometry, between(previous, tileId));
      state = gapResult.state;
      dragStarted = dragStarted || gapResult.dragStarted;
      push(gapResult.selection);
    }
    const result = wheelGestureMove(state, geometry, inside(tileId));
    state = result.state;
    dragStarted = dragStarted || result.dragStarted;
    push(result.selection);
  }

  const endResult = wheelGestureEnd(state, geometry, inside(tileIds[tileIds.length - 1]!));
  push(endResult.selection);
  return { released: endResult.released, changes, dragStarted };
}

describe('Swept-segment selection', () => {
  const lineGeometry: WheelGeometry = {
    diameter: 100,
    center: { x: 50, y: 50 },
    orbit: 0,
    tileSize: 20,
    visualRadius: 10,
    interactionRadius: 6,
    touchRadius: 6,
    deadZone: 8,
    neighbourDistance: 20,
    positions: [
      { id: 'A', char: 'آ', x: 10, y: 50 },
      { id: 'B', char: 'ب', x: 30, y: 50 },
      { id: 'C', char: 'پ', x: 50, y: 50 },
      { id: 'D', char: 'ت', x: 70, y: 50 },
    ],
  };

  it('A→D را در یک نمونه می‌گیرد و B/C را جا نمی‌اندازد', () => {
    let state = wheelGestureDown(lineGeometry, [], { x: 10, y: 50 }).state;
    const swept = wheelGestureMove(state, lineGeometry, { x: 70, y: 50 });
    state = swept.state;
    expect(swept.selection).toEqual(['A', 'B', 'C', 'D']);
    expect(wheelGestureEnd(state, lineGeometry, { x: 70, y: 50 }).released).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('شروع روی فضای خالی و سپس ورود به حروف، drag ownership نمی‌گیرد', () => {
    const down = wheelGestureDown(lineGeometry, [], { x: 20, y: 50 });
    const move = wheelGestureMove(down.state, lineGeometry, { x: 70, y: 50 });
    expect(move.dragStarted).toBe(false);
    expect(move.selection).toBeNull();
    expect(move.state.ownsSelection).toBe(false);
    expect(wheelGestureEnd(move.state, lineGeometry, { x: 70, y: 50 }).released).toBeNull();
  });
});

describe('کشیدن انگشت روی حروف', () => {
  it('fingerDown(A) → move(B) → move(C) → move(D) → fingerUp نتیجه [A,B,C,D] می‌دهد', () => {
    const result = drag(['t0', 't1', 't2', 't3']);
    expect(result.released).toEqual(['t0', 't1', 't2', 't3']);
  });

  it('fingerDown(A) → move(B) → move(C) → move(B) → fingerUp نتیجه [A,B] می‌دهد', () => {
    const result = drag(['t0', 't1', 't2', 't1']);
    expect(result.released).toEqual(['t0', 't1']);
  });

  it('کشیدن سریع A..F هیچ حرفی را جا نمی‌گذارد', () => {
    const result = drag(['t0', 't1', 't2', 't3', 't4', 't5']);
    expect(result.released).toEqual(['t0', 't1', 't2', 't3', 't4', 't5']);
  });

  it('کشیدن روی حاشیه بین دو حرف، انتخاب را خراب نمی‌کند', () => {
    const result = drag(['t0', 't1', 't2']);
    expect(result.released).toEqual(['t0', 't1', 't2']);
  });

  it('اگر انگشت وسط دو حرف برود و برگردد، حرف اشتباه اضافه نمی‌شود', () => {
    let state = wheelGestureDown(geometry, [], inside('t0')).state;
    state = wheelGestureMove(state, geometry, inside('t1')).state;
    // انگشت در فاصله بین دو حرف است: هیچ تغییر تازه‌ای نباید رخ دهد
    const gap = wheelGestureMove(state, geometry, between('t1', 't2'));
    expect(gap.selection).toBeNull();
    state = gap.state;
    const back = wheelGestureMove(state, geometry, inside('t1'));
    expect(back.selection).toBeNull();
    expect(wheelGestureEnd(state, geometry, inside('t1')).released).toEqual(['t0', 't1']);
  });
});

describe('لمس ساده (Tap) در برابر کشیدن', () => {
  it('لمس ساده هیچ‌وقت ثبت نمی‌کند و انتخاب را عوض نمی‌کند', () => {
    const down = wheelGestureDown(geometry, ['t5'], inside('t0'));
    const end = wheelGestureEnd(down.state, geometry, inside('t0'));
    expect(end.released).toBeNull();
    expect(end.selection).toBeNull();
    expect(end.dragEnded).toBe(false);
  });

  it('لمس ساده روی حرفی که از قبل انتخاب شده، انتخاب را دست‌نخورده می‌گذارد', () => {
    const down = wheelGestureDown(geometry, ['t0', 't1'], inside('t0'));
    const end = wheelGestureEnd(down.state, geometry, inside('t0'));
    expect(end.selection).toBeNull();
    expect(end.released).toBeNull();
  });

  it('لمس روی حاشیه (بدون حرف) هیچ‌چیز را عوض نمی‌کند', () => {
    const empty = { x: 8, y: 8 };
    const down = wheelGestureDown(geometry, ['t0'], empty);
    expect(down.state.downTileId).toBeNull();
    const end = wheelGestureEnd(down.state, geometry, empty);
    expect(end.released).toBeNull();
  });
});

describe('شروع واژه تازه از حرفی که انتخاب نشده', () => {
  it('کشیدن از حرف تازه، انتخاب قبلی را کنار می‌گذارد', () => {
    const result = drag(['t3', 't4'], ['t0', 't1']);
    expect(result.released).toEqual(['t3', 't4']);
  });

  it('کشیدن از حرفی که در انتخاب هست، همان زنجیره را ادامه می‌دهد', () => {
    const result = drag(['t1', 't2'], ['t0', 't1']);
    expect(result.released).toEqual(['t0', 't1', 't2']);
  });
});

describe('حروف تکراری', () => {
  it('هر کاشی مستقل انتخاب می‌شود؛ دو «ا» دو شناسه جدا هستند', () => {
    const duplicated = Array.from({ length: 3 }, (_, index) => ({
      id: `d${index}`,
      char: index === 2 ? 'ب' : 'ا',
    }));
    const duplicateGeometry = computeWheelGeometry({
      tiles: duplicated,
      diameter: 300,
      preferredTileSize: 52,
    });
    const center = (id: string) => {
      const position = duplicateGeometry.positions.find(candidate => candidate.id === id)!;
      return { x: position.x + 1, y: position.y + 1 };
    };

    let state = wheelGestureDown(duplicateGeometry, [], center('d0')).state;
    state = wheelGestureMove(state, duplicateGeometry, center('d1')).state;
    state = wheelGestureMove(state, duplicateGeometry, center('d2')).state;
    const end = wheelGestureEnd(state, duplicateGeometry, center('d2'));
    expect(end.released).toEqual(['d0', 'd1', 'd2']);
  });
});

describe('لغو حرکت / چندلمسی / چرخه برنامه', () => {
  it('لغو، انتخاب را به حالت پیش از حرکت برمی‌گرداند', () => {
    const state = wheelGestureMove(
      wheelGestureDown(geometry, ['t0', 't1'], inside('t0')).state,
      geometry,
      inside('t3'),
    ).state;
    const cancelled = wheelGestureCancel(state);
    expect(cancelled.aborted).toBe(true);
    expect(cancelled.selection).toEqual(['t0', 't1']);
  });

  it('لغو در حالت بدون حرکت هیچ تغییری نمی‌سازد', () => {
    const cancelled = wheelGestureCancel(createWheelInteractionState());
    expect(cancelled.selection).toBeNull();
    expect(cancelled.aborted).toBe(false);
  });

  it.each(['multi-touch', 'background', 'navigation', 'modal'])(
    '%s انتخاب نیمه‌تمام را restore می‌کند و هیچ submission نمی‌سازد', reason => {
      const dragging = wheelGestureMove(
        wheelGestureDown(geometry, ['t4'], inside('t0')).state,
        geometry,
        inside('t1'),
      ).state;
      const cancelled = wheelGestureCancel(dragging);
      expect(cancelled.aborted).toBe(true);
      expect(cancelled.released).toBeNull();
      expect(cancelled.selection).toEqual(['t4']);
      expect(cancelled.state.phase).toBe('idle');
      expect(reason).toBeTruthy();
    },
  );

  it('پس از لغو، حرکت بعدی با حالت تازه و مستقل شروع می‌شود', () => {
    const state = wheelGestureMove(
      wheelGestureDown(geometry, [], inside('t0')).state,
      geometry,
      inside('t1'),
    ).state;
    const cancelled = wheelGestureCancel(state);
    expect(cancelled.state.phase).toBe('idle');
    const again = wheelGestureDown(geometry, ['t4'], inside('t5'));
    expect(again.state.downTileId).toBe('t5');
    expect(again.state.activeTileId).toBe('t5');
  });
});

describe('همگام‌سازی انتخاب با وضعیت بازی (adoptSelection)', () => {
  it('وقتی کشیدن در جریان نیست، انتخاب تازه پذیرفته می‌شود', () => {
    const state = adoptSelection(createWheelInteractionState(), ['a', 'b']);
    expect(state.selection).toEqual(['a', 'b']);
    expect(state.snapshot).toEqual(['a', 'b']);
  });

  it('آرایه هم‌محتوا (با ارجاع متفاوت) حالت را بی‌دلیل عوض نمی‌کند', () => {
    const first = adoptSelection(createWheelInteractionState(), ['a']);
    const second = adoptSelection(first, ['a']);
    expect(second).toBe(first);
  });

  it('در میانه کشیدن، انتخاب تازه از بیرون نادیده گرفته می‌شود', () => {
    const dragging = wheelGestureMove(
      wheelGestureDown(geometry, [], inside('t0')).state,
      geometry,
      inside('t1'),
    ).state;
    expect(adoptSelection(dragging, ['z'])).toBe(dragging);
  });

  it('پس از پایان کشیدن، انتخاب نهایی در حالت می‌ماند تا کشیدن بعدی از آن شروع شود', () => {
    const end = wheelGestureEnd(
      wheelGestureMove(wheelGestureDown(geometry, [], inside('t0')).state, geometry, inside('t1'))
        .state,
      geometry,
      inside('t1'),
    );
    expect(end.state.selection).toEqual(['t0', 't1']);
    expect(end.state.snapshot).toEqual(['t0', 't1']);
    const nextDown = wheelGestureDown(geometry, end.state.selection, inside('t3'));
    expect(nextDown.state.snapshot).toEqual(['t0', 't1']);
  });

  it('پس از لغو بدون مالکیت، انتخاب قبلی در حالت می‌ماند', () => {
    const holding = wheelGestureDown(geometry, ['t5'], between('t0', 't1')).state;
    const cancelled = wheelGestureCancel(holding);
    expect(cancelled.state.selection).toEqual(['t5']);
    expect(cancelled.state.snapshot).toEqual(['t5']);
  });
});

describe('حرکت بدون رویداد down', () => {
  it('اگر رویداد down نرسد، حرف زیر انگشت همچنان انتخاب می‌شود', () => {
    const result = wheelGestureMove(createWheelInteractionState(), geometry, inside('t2'));
    expect(result.selection).toEqual(['t2']);
    expect(result.dragStarted).toBe(true);
  });
});

describe('انتخاب تازه فقط زمانی نوشته می‌شود که واقعاً عوض شود', () => {
  it('نخستین حرکت مالکیت می‌گیرد و کاشی زیر انگشت را می‌نویسد؛ حرکت‌های بعدی داخل همان کاشی چیزی نمی‌نویسند', () => {
    const down = wheelGestureDown(geometry, [], inside('t0'));
    expect(down.selection).toBeNull();
    expect(down.dragStarted).toBe(false);

    const first = wheelGestureMove(down.state, geometry, inside('t0'));
    expect(first.selection).toEqual(['t0']);
    expect(first.dragStarted).toBe(true);

    const second = wheelGestureMove(first.state, geometry, at('t0'));
    expect(second.selection).toBeNull();
    expect(second.dragStarted).toBe(false);
  });

  it('رفتن به کاشی بعدی یک به‌روزرسانی و ماندن روی همان کاشی هیچ به‌روزرسانی‌ای نمی‌سازد', () => {
    let state = wheelGestureMove(wheelGestureDown(geometry, [], at('t0')).state, geometry, at('t0')).state;
    const toSecond = wheelGestureMove(state, geometry, at('t1'));
    expect(toSecond.selection).toEqual(['t0', 't1']);
    state = toSecond.state;
    expect(wheelGestureMove(state, geometry, inside('t1')).selection).toBeNull();
    expect(wheelGestureMove(state, geometry, { x: at('t1').x - 2, y: at('t1').y + 2 }).selection).toBeNull();
  });
});
