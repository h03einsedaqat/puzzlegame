import React, { useCallback, useState } from 'react';

import { GAME_CONFIG, strings } from '../../constants';
import { useProfile, useServices } from '../../context';
import { colors } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface HeartRefillDialogProps {
  visible: boolean;
  onClose: () => void;
  /** پس از پر شدن موفق قلب‌ها؛ مثلاً برای ادامه بازی */
  onRefilled?: () => void;
  /** توضیح تکمیلی زیر دکمه‌ها؛ مثل زمان پر شدن خودکار قلب بعدی */
  note?: string;
}

/**
 * دیالوگ «قلب‌ها تمام شده».
 *
 * به‌جای بستن دست بازیکن، دو راه روشن می‌گذارد: صبر کردن برای پر شدن خودکار قلب
 * یا پر کردن فوری همه قلب‌ها با سکه. هزینه از پیکربندی بازی خوانده می‌شود و اگر
 * سکه کافی نباشد دکمه غیرفعال می‌شود تا بازیکن سرخورده نشود.
 */
export function HeartRefillDialog({ visible, onClose, onRefilled, note }: HeartRefillDialogProps) {
  const { profile, hearts, spendCoins, fillHearts } = useProfile();
  const { sound, vibration } = useServices();
  const [error, setError] = useState<string | null>(null);

  const cost = GAME_CONFIG.economy.heartRefillCoinCost;
  const canAfford = profile.coins >= cost;
  const alreadyFull = hearts.hearts >= hearts.maxHearts;

  const handleRefill = useCallback(() => {
    if (alreadyFull) {
      onClose();
      return;
    }
    if (!spendCoins(cost)) {
      setError(strings.hearts.buyNotEnoughCoins);
      return;
    }
    fillHearts();
    sound.play('reward');
    vibration.trigger('reward');
    setError(null);
    onRefilled?.();
    onClose();
  }, [alreadyFull, cost, fillHearts, onClose, onRefilled, sound, spendCoins, vibration]);

  return (
    <ConfirmDialog
      visible={visible}
      title={strings.hearts.buyTitle}
      body={alreadyFull ? strings.hearts.heartsFull : format(strings.hearts.buyBody, { cost: toPersianDigits(cost) })}
      confirmLabel={alreadyFull ? strings.common.gotIt : format(strings.hearts.buyButton, { cost: toPersianDigits(cost) })}
      cancelLabel={strings.common.later}
      confirmDisabled={!alreadyFull && !canAfford}
      onConfirm={handleRefill}
      onCancel={() => {
        setError(null);
        onClose();
      }}
      footer={
        <>
          {note ? (
            <AppText variant="caption" color={colors.textMuted} align="center">
              {note}
            </AppText>
          ) : null}
          {alreadyFull || canAfford ? null : (
            <AppText variant="caption" color={colors.danger} align="center">
              {error ?? strings.hearts.buyNotEnoughCoins}
            </AppText>
          )}
        </>
      }
    />
  );
}
