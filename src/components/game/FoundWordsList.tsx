import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { strings } from '../../constants';
import { colors, radius, spacing } from '../../theme';
import { toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import type { FoundWord } from '../../types';

export interface HintedWord {
  word: string;
  indices: readonly number[];
  full: boolean;
}

export interface FoundWordsListProps {
  targetWords: readonly string[];
  bonusWords: readonly string[];
  foundWords: readonly FoundWord[];
  hintedWords: readonly HintedWord[];
  /** نمایش بخش واژه‌های امتیازی */
  showBonus?: boolean;
}

interface WordRowState {
  word: string;
  found: boolean;
  score: number;
  hinted: boolean;
  revealedIndices: readonly number[];
}

function buildRows(
  words: readonly string[],
  foundWords: readonly FoundWord[],
  hintedWords: readonly HintedWord[],
): WordRowState[] {
  return words.map(word => {
    const found = foundWords.find(entry => entry.word === word);
    const hinted = hintedWords.find(entry => entry.word === word);
    return {
      word,
      found: found !== undefined,
      score: found?.score ?? 0,
      hinted: hinted !== undefined,
      revealedIndices: hinted?.indices ?? [],
    };
  });
}

/**
 * فهرست واژه‌های مرحله.
 *
 * واژه‌های پیدانشده با نقطه نشان داده می‌شوند و حرف‌های آشکارشده با راهنما در
 * جای خودشان دیده می‌شوند؛ این کار راهنما را قابل استفاده و در عین حال کمکی
 * می‌کند. واژه‌های امتیازی جداگانه و فقط در صورت وجود نمایش داده می‌شوند.
 */
export function FoundWordsList({
  targetWords,
  bonusWords,
  foundWords,
  hintedWords,
  showBonus = true,
}: FoundWordsListProps) {
  const targetRows = useMemo(() => buildRows(targetWords, foundWords, hintedWords), [targetWords, foundWords, hintedWords]);
  const bonusRows = useMemo(() => buildRows(bonusWords, foundWords, hintedWords), [bonusWords, foundWords, hintedWords]);
  const foundBonus = bonusRows.filter(row => row.found);

  return (
    <View style={styles.container}>
      <View style={styles.rows}>
        {targetRows.map(row => (
          <View key={row.word} style={[styles.row, row.found ? styles.rowFound : null]}>
            {row.found ? (
              <View style={styles.letterRow}>
                <Icon name="check" size={16} color={colors.success} />
                <AppText variant="bodyStrong" color={colors.success}>
                  {row.word}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {toPersianDigits(row.score)}
                </AppText>
              </View>
            ) : (
              <View style={styles.letterRow}>
                {Array.from(row.word).map((char, index) => {
                  const revealed = row.revealedIndices.includes(index);
                  return (
                    <View key={`${row.word}-${index}`} style={[styles.letterBox, revealed ? styles.letterBoxRevealed : null]}>
                      <AppText variant="caption" color={revealed ? colors.primaryDark : colors.textMuted}>
                        {revealed ? char : '•'}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </View>

      {showBonus && bonusRows.length > 0 ? (
        <View style={styles.bonusSection}>
          <View style={styles.bonusHeader}>
            <Icon name="sparkle" size={16} color={colors.accentDark} />
            <AppText variant="caption" color={colors.textSecondary}>
              {strings.game.bonusWordsTitle}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {toPersianDigits(foundBonus.length)}/{toPersianDigits(bonusRows.length)}
            </AppText>
          </View>
          {foundBonus.length > 0 ? (
            <View style={styles.bonusWords}>
              {foundBonus.map(row => (
                <View key={row.word} style={styles.bonusChip}>
                  <AppText variant="caption" color={colors.accentDark}>
                    {row.word}
                  </AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="caption" color={colors.textMuted}>
              {strings.game.bonusFound}
            </AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  rows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  rowFound: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  letterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  letterBox: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  letterBoxRevealed: {
    backgroundColor: colors.primaryLight,
  },
  bonusSection: {
    gap: spacing.xs,
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bonusWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  bonusChip: {
    backgroundColor: colors.accentLight,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
});
