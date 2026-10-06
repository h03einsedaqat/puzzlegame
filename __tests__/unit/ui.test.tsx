import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { strings } from '../../src/constants';
import { ServicesProvider, SettingsProvider } from '../../src/context';
import { format } from '../../src/utils/format';
import {
  AppText,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FeedbackBanner,
  FoundWordsList,
  GameHeader,
  HeartCounter,
  IconButton,
  LetterGrid,
  LetterTile,
  LetterWheel,
  LevelNode,
  PressableScale,
  ProgressBar,
  ScreenContainer,
  ScreenHeader,
  StatChip,
  ToggleRow,
  WordSlots,
} from '../../src/components';
import type { FoundWord, LetterTileData, LevelSummary } from '../../src/types';

type TestGlobals = { __resetAsyncStorage: () => void };
const testGlobals = globalThis as unknown as TestGlobals;

beforeEach(() => {
  testGlobals.__resetAsyncStorage();
});

async function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ServicesProvider>
      <SettingsProvider>{ui}</SettingsProvider>
    </ServicesProvider>,
  );
}

const tile = (id: string, char: string): LetterTileData => ({ id, char });

const foundWord = (word: string, kind: FoundWord['kind']): FoundWord => ({
  word,
  kind,
  score: 45,
  coins: 3,
  combo: 1,
  revealed: false,
  foundAt: 1_700_000_000_000,
});

const summary: LevelSummary = {
  id: 4,
  title: 'خانه و زندگی',
  difficulty: 'easy',
  targetCount: 4,
  isCompleted: false,
};

describe('اجزای پایه رابط', () => {
  it('AppText متن را با سبک خواسته‌شده نشان می‌دهد', async () => {
    await renderWithProviders(
      <>
        <AppText variant="body">متن بدنه</AppText>
        <AppText variant="numeric">۱۲۳</AppText>
      </>,
    );
    expect(screen.getByText('متن بدنه')).toBeTruthy();
    expect(screen.getByText('۱۲۳')).toBeTruthy();
  });

  it('Button برچسب را نشان می‌دهد و فشار را گزارش می‌کند', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="شروع بازی" onPress={onPress} />);

    await fireEvent.press(screen.getByText('شروع بازی'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Button غیرفعال فشار را نمی‌فرستد', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="شروع" onPress={onPress} disabled />);

    const button = screen.getByLabelText('شروع');
    expect(button.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('IconButton با برچسب دسترس‌پذیری کار می‌کند', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<IconButton icon="settings" accessibilityLabel="تنظیمات" onPress={onPress} />);

    await fireEvent.press(screen.getByLabelText('تنظیمات'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Card فرزندان را نمایش می‌دهد', async () => {
    await renderWithProviders(
      <Card>
        <AppText>محتوای کارت</AppText>
      </Card>,
    );
    expect(screen.getByText('محتوای کارت')).toBeTruthy();
  });

  it('ProgressBar نسبت را در بازه معتبر نگه می‌دارد', async () => {
    await renderWithProviders(
      <>
        <ProgressBar ratio={2} accessibilityLabel="پیشرفت" />
        <ProgressBar ratio={-1} accessibilityLabel="پیشرفت منفی" />
      </>,
    );
    expect(screen.getByLabelText('پیشرفت').props.accessibilityValue?.now).toBe(100);
    expect(screen.getByLabelText('پیشرفت منفی').props.accessibilityValue?.now).toBe(0);
  });

  it('StatChip مقدار و برچسب را نشان می‌دهد', async () => {
    await renderWithProviders(<StatChip icon="coin" value="۱۲۰" label="سکه" />);
    expect(screen.getByText('۱۲۰')).toBeTruthy();
    expect(screen.getByLabelText('سکه')).toBeTruthy();
  });

  it('ToggleRow وضعیت را برمی‌گرداند', async () => {
    const onValueChange = jest.fn();
    await renderWithProviders(
      <ToggleRow icon="sound" title="صدا" description="افکت‌های صوتی" value onValueChange={onValueChange} />,
    );

    await fireEvent.press(screen.getByLabelText('صدا'));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('ConfirmDialog دکمه‌ها را به کنش‌ها وصل می‌کند', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await renderWithProviders(
      <ConfirmDialog
        visible
        title="خروج از مرحله؟"
        body="پیشرفت این مرحله ذخیره نمی‌شود."
        confirmLabel="خروج"
        cancelLabel="ادامه بازی"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('خروج از مرحله؟')).toBeTruthy();
    await fireEvent.press(screen.getByText('خروج'));
    await fireEvent.press(screen.getByText('ادامه بازی'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ConfirmDialog پنهان چیزی رندر نمی‌کند', async () => {
    await renderWithProviders(
      <ConfirmDialog
        visible={false}
        title="پنهان"
        confirmLabel="بله"
        cancelLabel="خیر"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.queryByText('پنهان')).toBeNull();
  });

  it('FeedbackBanner پیام و جزئیات را نشان می‌دهد', async () => {
    await renderWithProviders(<FeedbackBanner message="آفرین!" tone="success" detail="۴۵ امتیاز گرفتی" />);
    expect(screen.getByText('آفرین!')).toBeTruthy();
    expect(screen.getByText('۴۵ امتیاز گرفتی')).toBeTruthy();
  });

  it('EmptyState اقدام پیشنهادی را صدا می‌زند', async () => {
    const onAction = jest.fn();
    await renderWithProviders(
      <EmptyState
        icon="info"
        title="هنوز دستاوردی نیست"
        body="با بازی کردن باز می‌شود"
        actionLabel="شروع"
        onAction={onAction}
      />,
    );

    await fireEvent.press(screen.getByText('شروع'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('PressableScale فشار را می‌فرستد', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <PressableScale onPress={onPress} accessibilityLabel="لمس">
        <AppText>لمس کن</AppText>
      </PressableScale>,
    );

    await fireEvent.press(screen.getByLabelText('لمس'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ScreenHeader عنوان، زیرعنوان و بازگشت را نشان می‌دهد', async () => {
    const onBack = jest.fn();
    await renderWithProviders(<ScreenHeader title="تنظیمات" subtitle="صدا و لرزش" onBack={onBack} backLabel="بازگشت" />);

    expect(screen.getByText('تنظیمات')).toBeTruthy();
    expect(screen.getByText('صدا و لرزش')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('بازگشت'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('ScreenContainer فرزندان را در حالت اسکرول و بدون آن نشان می‌دهد', async () => {
    await renderWithProviders(
      <>
        <ScreenContainer testID="plain">
          <AppText>ساده</AppText>
        </ScreenContainer>
        <ScreenContainer scrollable testID="scroll">
          <AppText>اسکرولی</AppText>
        </ScreenContainer>
      </>,
    );
    expect(screen.getByText('ساده')).toBeTruthy();
    expect(screen.getByText('اسکرولی')).toBeTruthy();
  });
});

describe('اجزای بازی', () => {
  it('LetterTile حرف را نشان می‌دهد و شناسه کاشی را می‌فرستد', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <LetterTile char="ک" size={56} tileId="t_1" onPress={onPress} accessibilityLabel="حرف ک" />,
    );

    expect(screen.getByText('ک')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('حرف ک'));
    expect(onPress).toHaveBeenCalledWith('t_1');
  });

  it('LetterTile غیرفعال فشار را نمی‌پذیرد', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <LetterTile char="ب" size={56} tileId="t_2" onPress={onPress} disabled accessibilityLabel="حرف ب" />,
    );

    await fireEvent.press(screen.getByLabelText('حرف ب'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('LetterWheel حروف را دور چرخ می‌چیند، پیشرفت را نشان می‌دهد و لمس کاشی را می‌فرستد', async () => {
    const onTilePress = jest.fn();
    const tiles = ['ک', 'ت', 'ا', 'ب', 'ر', 'م'].map((char, index) => tile(`t${index}`, char));
    await renderWithProviders(
      <LetterWheel
        tiles={tiles}
        selectedIds={['t2']}
        onTilePress={onTilePress}
        onTileRemove={jest.fn()}
        onAutoSubmit={jest.fn()}
        diameter={300}
        tileSize={54}
        foundCount={2}
        totalCount={6}
        accessibilityLabel="چرخ حروف"
      />,
    );

    // همه حروف با برچسب دسترس‌پذیری ساخته می‌شوند (هم برای لمس و هم برای screen reader)
    for (const char of ['ک', 'ت', 'ا', 'ب', 'ر', 'م']) {
      expect(screen.getAllByLabelText(format(strings.accessibility.letterTile, { letter: char })).length).toBe(1);
    }

    // پیشرفت کلمه‌های مرحله در مرکز چرخ دیده می‌شود (۲ از ۶)
    expect(screen.getByText('۲/۶')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(format(strings.accessibility.letterTile, { letter: 'ب' })));
    expect(onTilePress).toHaveBeenCalledWith('t3');
  });

  it('LetterGrid همه حروف را می‌چیند و کاشی درست را گزارش می‌کند', async () => {
    const onTilePress = jest.fn();
    await renderWithProviders(
      <LetterGrid
        tiles={[tile('t_1', 'ک'), tile('t_2', 'ت'), tile('t_3', 'ا'), tile('t_4', 'ب')]}
        tileSize={56}
        selectedIds={['t_3']}
        onTilePress={onTilePress}
      />,
    );

    for (const char of ['ک', 'ت', 'ا', 'ب']) {
      expect(screen.getByText(char)).toBeTruthy();
    }
    await fireEvent.press(screen.getByText('ب'));
    expect(onTilePress).toHaveBeenCalledWith('t_4');
  });

  it('WordSlots انتخاب‌شده‌ها را نشان می‌دهد و حذف را می‌فرستد', async () => {
    const onRemove = jest.fn();
    await renderWithProviders(
      <WordSlots
        selected={[tile('t_1', 'ک'), tile('t_2', 'ت')]}
        maxLength={5}
        availableWidth={320}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('ک')).toBeTruthy();
    expect(screen.getByText('ت')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('ک'));
    expect(onRemove).toHaveBeenCalledWith('t_1');
  });

  it('FoundWordsList واژه‌های یافته و امتیازی را نشان می‌دهد', async () => {
    await renderWithProviders(
      <FoundWordsList
        targetWords={['کتاب', 'کاتب']}
        bonusWords={['بت']}
        foundWords={[foundWord('کتاب', 'target'), foundWord('بت', 'bonus')]}
        hintedWords={[{ word: 'کاتب', indices: [0, 2], full: false }]}
      />,
    );

    expect(screen.getByText('کتاب')).toBeTruthy();
    expect(screen.getByText('بت')).toBeTruthy();
    expect(screen.queryByText('کاتب')).toBeNull();
  });

  it('HeartCounter تعداد قلب و زمان پر شدن بعدی را نشان می‌دهد', async () => {
    const now = Date.now();
    await renderWithProviders(<HeartCounter hearts={3} maxHearts={5} nextRefillAt={now + 65_000} />);

    expect(screen.getByText('۳/۵')).toBeTruthy();
    expect(screen.getByText(/قلب بعدی تا/)).toBeTruthy();
  });

  it('HeartCounter وقتی قلب‌ها پر است شمارش معکوس ندارد', async () => {
    await renderWithProviders(<HeartCounter hearts={5} maxHearts={5} nextRefillAt={null} />);
    expect(screen.getByText('۵/۵')).toBeTruthy();
    expect(screen.queryByText('۰۰:۰۰')).toBeNull();
  });

  it('GameHeader عنوان، امتیاز و سکه را نشان می‌دهد', async () => {
    await renderWithProviders(
      <GameHeader
        title="خانه و زندگی"
        difficulty="easy"
        score={120}
        coins={14}
        foundTargets={2}
        totalTargets={4}
        hearts={4}
        maxHearts={5}
        nextRefillAt={null}
        onBack={jest.fn()}
        backLabel="بازگشت"
      />,
    );

    expect(screen.getByText('خانه و زندگی')).toBeTruthy();
    expect(screen.getByText('۱۲۰')).toBeTruthy();
    expect(screen.getByText('۱۴')).toBeTruthy();
  });

  it('LevelNode در حالت باز فشار می‌پذیرد و در حالت قفل نه', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <>
        <LevelNode summary={summary} state="current" onPress={onPress} accessibilityLabel="مرحله ۴" />
        <LevelNode summary={{ ...summary, id: 5 }} state="locked" onPress={onPress} accessibilityLabel="مرحله ۵" />
      </>,
    );

    await fireEvent.press(screen.getByLabelText('مرحله ۴'));
    expect(onPress).toHaveBeenCalledWith(4);

    await fireEvent.press(screen.getByLabelText('مرحله ۵'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('LevelNode تکمیل‌شده بهترین امتیاز را نشان می‌دهد', async () => {
    await renderWithProviders(
      <LevelNode
        summary={{ ...summary, isCompleted: true }}
        state="completed"
        bestScore={320}
        onPress={jest.fn()}
        accessibilityLabel="مرحله ۴"
      />,
    );

    expect(screen.getByText('۳۲۰')).toBeTruthy();
  });
});
