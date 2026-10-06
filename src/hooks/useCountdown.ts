import { useEffect, useMemo, useState } from 'react';

import { format } from '../utils/format';

export interface CountdownState {
  /** متن آماده نمایش؛ مثل «۱۲:۳۰» */
  text: string;
  remainingMs: number;
  finished: boolean;
}

/**
 * شمارش معکوس تا یک زمان مشخص.
 *
 * تا وقتی هدف در آینده است هر ثانیه به‌روزرسانی می‌شود و به‌محض رسیدن به صفر
 * متوقف می‌شود تا بیهوده رندر نشود.
 */
export function useCountdown(targetAt: number | null, intervalMs = 1000): CountdownState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetAt === null) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= targetAt) {
        clearInterval(timer);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [targetAt, intervalMs]);

  return useMemo(() => {
    if (targetAt === null) {
      return { text: '', remainingMs: 0, finished: true };
    }
    const remainingMs = Math.max(0, targetAt - now);
    return {
      text: formatDurationText(remainingMs),
      remainingMs,
      finished: remainingMs === 0,
    };
  }, [now, targetAt]);
}

/** مدت‌زمان به قالب «mm:ss» یا «h:mm:ss» با ارقام فارسی */
export function formatDurationText(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  const text = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  return format('{value}', { value: text }).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] ?? digit);
}
