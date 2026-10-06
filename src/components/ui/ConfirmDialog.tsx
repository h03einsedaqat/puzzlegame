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
}

/**
 * گفت‌وگوی تأیید.
 *
 * با دکمه بازگشت اندروید (onRequestClose) هم بسته می‌شود تا رفتار سیستمی
 * حفظ شود و خواننده صفحه (accessibility) محتوای گفت‌وگو را اعلام کند.
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
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
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
            />
            <Button label={cancelLabel} variant="ghost" size="medium" onPress={onCancel} />
          </View>
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
});
