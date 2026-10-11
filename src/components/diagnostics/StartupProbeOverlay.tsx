import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  PROBE_ENABLED,
  getMarks,
  subscribeProbe,
  type ProbeMark,
} from '../../services/diagnostics/startupProbe';

/** ⚠️ موقت: overlay تشخیصی؛ با PROBE_ENABLED=false یا حذف این فایل از بین می‌رود. */
export function StartupProbeOverlay() {
  const [marks, setMarks] = useState<readonly ProbeMark[]>(() => getMarks());

  useEffect(() => subscribeProbe(() => setMarks(getMarks())), []);

  if (!PROBE_ENABLED) {
    return null;
  }

  const origin = marks[0]?.at ?? 0;
  const rows = marks.slice(-14);

  return (
    <View pointerEvents="none" style={styles.box}>
      <ScrollView>
        {rows.map((entry, index) => {
          const previous = index > 0 ? rows[index - 1] : undefined;
          const delta = previous ? entry.at - previous.at : 0;
          return (
            <Text
              key={`${entry.at}-${index}`}
              style={[styles.line, delta >= 500 ? styles.slow : null]}
            >
              {`+${entry.at - origin}ms Δ${delta}ms ${entry.label}${
                entry.durationMs !== undefined ? ` [dur ${entry.durationMs}ms]` : ''
              }`}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 40,
    maxHeight: 220,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.78)',
    zIndex: 9999,
  },
  line: {
    color: '#e8f5e9',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'left',
  },
  slow: {
    color: '#ffb74d',
    fontWeight: '700',
  },
});
