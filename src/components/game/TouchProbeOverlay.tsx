import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  TOUCH_PROBE_ENABLED,
  getTouchProbeSnapshot,
  type TouchProbeSnapshot,
} from '../../services/diagnostics/touchProbe';

/** نمایش زنده‌ی نتایج پروب لمس (موقت، فقط وقتی پروب فعال است). */
export function TouchProbeOverlay() {
  const [snap, setSnap] = useState<TouchProbeSnapshot | null>(null);

  useEffect(() => {
    if (!TOUCH_PROBE_ENABLED) {
      return;
    }
    const timer = setInterval(() => setSnap(getTouchProbeSnapshot()), 250);
    return () => clearInterval(timer);
  }, []);

  if (!TOUCH_PROBE_ENABLED || !snap) {
    return null;
  }

  const fmt = (value: number | null) => (value === null ? '-' : `${value}ms`);
  const lines = [
    'پروب لمس (تشخیصی)',
    `انتخاب‌ها: ${snap.selectionEvents} | اولین: ${fmt(snap.firstSelectionAtMs)}`,
    `تأخیر صف UI→JS: ${fmt(snap.queueDelayMs)} (بیشینه ${snap.maxQueueDelayMs}ms)`,
    `تأخیر رندر: ${fmt(snap.commitDelayMs)} (بیشینه ${snap.maxCommitDelayMs}ms)`,
    `وقفهٔ JS: ${snap.stallCount} بار | بزرگ‌ترین ${snap.maxStallMs}ms`,
    `اولین وقفه در: ${fmt(snap.firstStallAtMs)} | آخرین در: ${fmt(snap.lastStallAtMs)}`,
    ...snap.ops.map(
      op => `${op.name}: بیشینه ${op.maxMs}ms | بیش از ۵۰ms: ${op.slowCount}/${op.count}`,
    ),
  ];

  return (
    <View pointerEvents="none" style={styles.box}>
      {lines.map(line => (
        <Text key={line} style={styles.text}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    zIndex: 999,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  text: {
    color: '#FFD54F',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'left',
  },
});
