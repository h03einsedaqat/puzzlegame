import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, shadows, spacing, typography } from '../../theme';
import { AppText } from '../ui/AppText';
import { PressableScale } from '../ui/PressableScale';
import type { LetterTileData } from '../../types';

export interface WordSlotsProps {
  selected: readonly LetterTileData[];
  /** بیشترین طول واژه در این مرحله؛ تعداد جاهای خالی را تعیین می‌کند */
  maxLength: number;
  availableWidth: number;
  onRemove: (tileId: string) => void;
  /** حرف‌هایی که با راهنما آشکار شده‌اند و در جای خود نمایش داده می‌شوند */
  revealedLetters?: readonly string[];
  /** اندازه پیشنهادی هر جای خالی؛ از چیدمان صفحه می‌آید */
  size?: number;
}

const MIN_SLOTS = 3;
/**
 * سقف جاهای خالی برابر بیشترین طول واژه در مرحله‌هاست (۷ حرف).
 * پیش‌تر این عدد ۶ بود و در مرحله‌های ۷ حرفی، حرف آخر انتخاب‌شده جایی برای
 * دیده‌شدن نداشت؛ یعنی بازیکن حرف می‌زد و «گم» می‌شد.
 */
const MAX_SLOTS = 9;
const GAP = spacing.sm;
const MIN_SLOT_SIZE = 30;
const MAX_SLOT_SIZE = 48;

/**
 * جای خالی واژه.
 *
 * تعداد جای‌ها با پیشرفت انتخاب رشد می‌کند (از سه جای خالی تا سقف طول واژه در
 * مرحله) و اندازه هر جای خالی با عرض موجود و ارتفاع چیدمان تنظیم می‌شود؛ اندازه
 * هرگز طوری بزرگ نمی‌شود که از عرض صفحه بیرون بزند. لمس هر جای پر‌شده، همان حرف
 * را برمی‌گرداند.
 */
export const WordSlots = React.memo(function WordSlots({
  selected,
  maxLength,
  availableWidth,
  onRemove,
  revealedLetters = [],
  size,
}: WordSlotsProps) {
  const slotCount = Math.max(
    MIN_SLOTS,
    Math.min(MAX_SLOTS, Math.max(maxLength, MIN_SLOTS), Math.max(selected.length, MIN_SLOTS)),
  );

  const slotSize = useMemo(() => {
    const usable = Math.max(0, availableWidth - GAP * (slotCount - 1));
    // اندازه هرگز از سهم عرض صفحه بیشتر نمی‌شود؛ پس هیچ‌وقت ردیف بیرون نمی‌زند.
    const byWidth = Math.max(20, Math.floor(usable / slotCount));
    const wanted = size ?? MAX_SLOT_SIZE;
    return Math.max(MIN_SLOT_SIZE, Math.min(MAX_SLOT_SIZE, wanted, byWidth));
  }, [availableWidth, size, slotCount]);

  const slots = Array.from({ length: slotCount }, (_, index) => selected[index]);

  return (
    <View style={[styles.container, { gap: GAP }]} accessibilityRole="text">
      {slots.map((tile, index) => {
        const isNext = !tile && index === selected.length;
        return tile ? (
          <PressableScale
            key={tile.id}
            onPress={() => onRemove(tile.id)}
            accessibilityRole="button"
            accessibilityLabel={tile.char}
          >
            <View style={[styles.slot, styles.filledSlot, { width: slotSize, height: slotSize, borderRadius: Math.round(slotSize * 0.32) }]}>
              <AppText
                style={[
                  typography.wordSlot,
                  {
                    fontSize: Math.round(slotSize * 0.54),
                    lineHeight: Math.round(slotSize * 0.7),
                    color: colors.slotText,
                    textShadowColor: 'rgba(255, 255, 255, 0.8)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 1,
                  },
                ]}
                allowFontScaling={false}
              >
                {tile.char}
              </AppText>
            </View>
          </PressableScale>
        ) : (
          <View
            key={`empty-${index}`}
            style={[
              styles.slot,
              {
                width: slotSize,
                height: slotSize,
                borderRadius: Math.round(slotSize * 0.32),
                borderWidth: isNext ? 2.5 : 2,
                borderColor: isNext ? colors.slotActiveBorder : colors.slotBorder,
                borderStyle: isNext ? 'solid' : 'dashed',
                backgroundColor: isNext ? colors.primaryLight : 'rgba(255, 255, 255, 0.65)',
              },
            ]}
          >
            {revealedLetters[index] ? (
              <AppText
                style={[
                  typography.wordSlot,
                  { fontSize: Math.round(slotSize * 0.46), lineHeight: Math.round(slotSize * 0.62), color: colors.textMuted },
                ]}
                allowFontScaling={false}
              >
                {revealedLetters[index]}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledSlot: {
    backgroundColor: colors.slotFilledBackground,
    borderWidth: 2,
    borderColor: colors.accentDark,
    borderBottomWidth: 4,
    ...shadows.soft,
  },
});
