import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { Repository } from '../services/storage/repositories';

const SAVE_DEBOUNCE_MS = 250;

export interface PersistentReducerResult<S, A> {
  state: S;
  dispatch: React.Dispatch<A>;
  /** داده‌های ذخیره‌شده بارگذاری شده‌اند */
  ready: boolean;
  /** داده قبلی خراب بود و مقدار پیش‌فرض جایگزین شد */
  recovered: boolean;
  reset: () => Promise<void>;
}

/**
 * وضعیت ماندگار.
 *
 * الگوی مشترک همه بخش‌های ذخیره‌شده برنامه: بارگذاری یک‌باره از مخزن، اجرای
 * reducer خالص و ذخیره‌ی تأخیری (debounce) تغییرات. ذخیره تأخیری از نوشتن‌های
 * پرشمار روی حافظه در زمان بازی جلوگیری می‌کند.
 *
 * نوشتن‌های معلق در دو لحظه فوراً ذخیره می‌شوند تا پیشرفت کاربر از دست نرود:
 * رفتن برنامه به پس‌زمینه (احتمال بسته‌شدن توسط سیستم) و پیاده‌شدن درخت رابط.
 */
export function usePersistentReducer<S, A>(
  repository: Repository<S>,
  reducer: (state: S, action: A) => S,
  createInitial: () => S = repository.createDefault,
): PersistentReducerResult<S, A> {
  const [state, dispatch] = useReducer(reducer, undefined, createInitial);
  const [ready, setReady] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);
  const pending = useRef(false);
  const latest = useRef(state);
  latest.current = state;

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!pending.current) {
      return;
    }
    pending.current = false;
    repository.save(latest.current).catch(() => undefined);
  }, [repository]);

  useEffect(() => {
    let cancelled = false;
    repository
      .load()
      .then(result => {
        if (cancelled) {
          return;
        }
        skipNextSave.current = true;
        dispatch({ type: '__hydrate', state: result.data } as unknown as A);
        setRecovered(result.recovered);
        setReady(true);
        // داده خراب یا ناسازگار با مقدار پیش‌فرض جبران شده است؛ همان مقدار
        // سالم روی حافظه نوشته می‌شود تا هر بار دوباره جبران لازم نباشد.
        if (result.recovered) {
          repository.save(result.data).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (timer.current) {
      clearTimeout(timer.current);
    }
    pending.current = true;
    timer.current = setTimeout(() => {
      timer.current = null;
      pending.current = false;
      repository.save(latest.current).catch(() => undefined);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [state, ready, repository]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status !== 'active') {
        flush();
      }
    });
    return () => {
      subscription.remove();
      flush();
    };
  }, [flush]);

  const reset = useCallback(async () => {
    await repository.clear();
    skipNextSave.current = true;
    pending.current = false;
    dispatch({ type: '__hydrate', state: repository.createDefault() } as unknown as A);
  }, [repository]);

  return { state, dispatch, ready, recovered, reset };
}

/** اکشن داخلی بارگذاری؛ همه reducer‌ها آن را می‌شناسند. */
export interface HydrateAction<S> {
  type: '__hydrate';
  state: S;
}
