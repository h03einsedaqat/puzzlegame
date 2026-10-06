import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { strings } from '../../constants';
import { format } from '../../utils/format';
import { spacing } from '../../theme';
import { LetterTile } from './LetterTile';
import type { LetterTileData } from '../../types';

export interface LetterGridProps {
  tiles: readonly LetterTileData[];
  tileSize: number;
  selectedIds: readonly string[];
  onTilePress: (tileId: string) => void;
  disabled?: boolean;
}

const GAP = spacing.sm + 2;

/**
 * چیدمان کاشی‌های حروف.
 *
 * تعداد کاشی‌ها بین ۴ تا ۹ است؛ برای اینکه هیچ‌وقت از عرض صفحه بیرون نزند،
 * تعداد ستون‌ها بر پایه اندازه کاشی و عرض موجود محاسبه می‌شود و ردیف‌ها در
 * مرکز قرار می‌گیرند.
 */
export function LetterGrid({ tiles, tileSize, selectedIds, onTilePress, disabled = false }: LetterGridProps) {
  const rows = useMemo(() => {
    const letters = tiles.map(tile => tile.char).join('');
    const maxPerRow = Math.max(3, Math.min(tiles.length, Math.floor(360 / (tileSize + GAP))));
    const grouped: LetterTileData[][] = [];
    for (let index = 0; index < tiles.length; index += maxPerRow) {
      grouped.push(tiles.slice(index, index + maxPerRow));
    }
    return { grouped, letters };
  }, [tileSize, tiles]);

  return (
    <View style={styles.container} accessibilityLabel={rows.letters}>
      {rows.grouped.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map(tile => (
            <LetterTile
              key={tile.id}
              tileId={tile.id}
              char={tile.char}
              size={tileSize}
              selected={selectedIds.includes(tile.id)}
              disabled={disabled}
              onPress={onTilePress}
              accessibilityLabel={format(strings.accessibility.letterTile, { letter: tile.char })}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: GAP,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    justifyContent: 'center',
  },
});
