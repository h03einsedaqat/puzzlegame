import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  /** دکمه سوم اختیاری؛ مثل «تماشای تبلیغ» برای دریافت قلب */
  extraLabel?: string;
  onExtra?: () => void;
  /** محتوای اختیاری زیر دکمه‌ها؛ پیام خطا یا توضیح هزینه */
  footer?: React.ReactNode;
  /** وقتی هزینه پرداخت‌نشدنی است، دکمه تأیید غیرفعال می‌ماند */
  confirmDisabled?: boolean;
}

/**
 * گفت‌وگوی تأیید.
 *
 * با دکمه بازگشت اندروید (onRequestClose) هم بسته می‌شود تا رفتار سیستمی
 * حفظ شود و خواننده صفحه (accessibility) محتوای گفت‌وگو را اعلام کند.
 *
 * وقتی پنهان است، هیچ پنجره بومی ساخته نمی‌شود (به‌جای `visible={false}`، جزء
 * کاملاً از درخت بیرون می‌رود) تا هیچ‌وقت پنجره‌ای روی صفحه نماند که لمس‌ها را
 * بگیرد و دکمه‌های بازی را بی‌واکنش کند.
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  extraLabel,
  onExtra,
  footer,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel={cancelLabel}>
        <Pressable style={styles.dialog} onPress={event => event.stopPropagation()} accessibilityViewIsModal>
          <AppText variant="heading" align="center">
            {title}
          </AppText>
          {body ? (
            <AppText variant="body" color={colors.textSecondary} align="center" style={styles.body}>
              {body}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            {extraLabel && onExtra ? (
              <Button label={extraLabel} variant="secondary" size="medium" onPress={onExtra} />
            ) : null}
            <Button
              label={confirmLabel}
              variant={destructive ? 'secondary' : 'primary'}
              size="medium"
              onPress={onConfirm}
              disabled={confirmDisabled}
            />
            <Button label={cancelLabel} variant="ghost" size="medium" onPress={onCancel} />
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.screenOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  body: {
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
