import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { strings } from '../../constants';
import { colors, radius, shadows, spacing } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import type { HintOption } from '../../context';
import type { HintType } from '../../types';

export interface HintSheetProps {
  visible: boolean;
  options: readonly HintOption[];
  coins: number;
  /** توضیح هر راهنما برای بازیکن */
  descriptions: Record<HintType, string>;
  onSelect: (type: HintType) => void;
  onClose: () => void;
  /** پس از خرید راهنما، این متن کوتاه بالای برگه دیده می‌شود */
  lastMessage?: string | null;
}

const HINT_ICONS: Record<HintType, 'bulb' | 'sparkle' | 'eye'> = {
  reveal_letter: 'bulb',
  smart_help: 'sparkle',
  reveal_word: 'eye',
};

const HINT_TITLES: Record<HintType, string> = {
  reveal_letter: strings.game.hintRevealLetterTitle,
  smart_help: strings.game.hintSmartHelpTitle,
  reveal_word: strings.game.hintRevealWordTitle,
};

/**
 * برگه راهنما.
 *
 * سه راهنما را کنار هم نشان می‌دهد: با قیمت، توضیح و وضعیت سکه بازیکن. قیمت‌ها
 * از پیکربندی بازی می‌آیند (نه از این فایل) و هر خرید در همان لحظه از سکه‌ها کم
 * می‌شود؛ بنابراین بازیکن پیش از زدن دکمه، دقیقاً می‌داند چه هزینه‌ای می‌پردازد.
 * اگر سکه کافی نباشد، دکمه غیرفعال می‌شود و راهنمای گرفتن سکه نشان داده می‌شود.
 *
 * این برگه **داخل خود صفحه** رسم می‌شود و از `Modal` بومی استفاده نمی‌کند؛ تجربه
 * نشان داد که پنجره گفت‌وگوی بومی اندروید، بعد از بسته‌شدن هم می‌تواند روی صفحه
 * بماند و همه لمس‌ها را ببلعد (همان «کار نکردن دکمه‌ها»یی که بازیکن گزارش کرد).
 * وقتی پنهان است، هیچ‌چیز رسم نمی‌شود؛ پس امکان قفل‌شدن لمس‌ها وجود ندارد.
 */
export function HintSheet({
  visible,
  options,
  coins,
  descriptions,
  onSelect,
  onClose,
  lastMessage,
}: HintSheetProps) {
  const sorted = useMemo(() => [...options].sort((a, b) => a.cost - b.cost), [options]);
  const canAffordAny = sorted.some(option => option.affordable);

  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  const handleSelect = useCallback(
    (type: HintType, affordable: boolean, available: boolean) => {
      if (!affordable || !available) {
        return;
      }
      onSelect(type);
    },
    [onSelect],
  );

  if (!visible) {
    return null;
  }

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [320, 0] });
  const backdropOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdropWrap, { opacity: backdropOpacity }]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel={strings.common.close}
        />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <AppText variant="heading">{strings.game.hintSheetTitle}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {lastMessage ?? strings.game.hintSheetSubtitle}
            </AppText>
          </View>
          <View style={styles.coinPill}>
            <Icon name="coin" size={18} color={colors.coin} />
            <AppText variant="numeric" color={colors.textPrimary}>
              {toPersianDigits(coins)}
            </AppText>
          </View>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {sorted.map(option => {
            const disabled = !option.affordable || !option.available;
            return (
              <View
                key={option.type}
                style={[styles.row, disabled ? styles.rowDisabled : null]}
                accessibilityRole="button"
                accessibilityLabel={format(strings.game.hintOptionLabel, {
                  title: HINT_TITLES[option.type],
                  cost: option.cost,
                })}
                accessibilityState={{ disabled }}
              >
                <View style={styles.rowHeader}>
                  <View style={styles.iconBadge}>
                    <Icon name={HINT_ICONS[option.type]} size={22} color={colors.primaryDark} />
                  </View>
                  <View style={styles.rowTexts}>
                    <AppText variant="bodyStrong">{HINT_TITLES[option.type]}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {descriptions[option.type]}
                    </AppText>
                  </View>
                </View>

                <View style={styles.rowFooter}>
                  <View style={styles.costPill}>
                    <Icon name="coin" size={16} color={colors.coinDark} />
                    <AppText variant="caption" color={colors.accentDark}>
                      {format(strings.game.hintCostLabel, { cost: option.cost })}
                    </AppText>
                  </View>
                  <Button
                    label={option.affordable ? strings.game.hintUseButton : strings.game.hintNoCoinsButton}
                    variant={option.affordable && option.available ? 'sunny' : 'secondary'}
                    size="small"
                    fullWidth={false}
                    disabled={disabled}
                    onPress={() => handleSelect(option.type, option.affordable, option.available)}
                    accessibilityLabel={format(strings.game.hintUseLabel, { title: HINT_TITLES[option.type] })}
                    style={styles.useButton}
                  />
                </View>
              </View>
            );
          })}

          {canAffordAny ? null : (
            <View style={styles.tipBox}>
              <Icon name="info" size={16} color={colors.textSecondary} />
              <AppText variant="caption" color={colors.textSecondary}>
                {strings.game.hintEarnCoinsTip}
              </AppText>
            </View>
          )}
        </ScrollView>

        <Button label={strings.common.close} variant="ghost" onPress={onClose} accessibilityLabel={strings.common.close} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  backdropWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.screenOverlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
    maxHeight: '82%',
    ...shadows.raised,
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentLight,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  list: {
    alignSelf: 'stretch',
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  row: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  useButton: {
    minWidth: 110,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
