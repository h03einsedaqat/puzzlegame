/** درجه سختی مرحله. سختی از روی معیارهای مختلف محاسبه می‌شود، نه فقط تعداد حروف. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'آسان',
  medium: 'متوسط',
  hard: 'سخت',
  expert: 'حرفه‌ای',
};

export interface LevelMetadata {
  /** دسته موضوعی واژه‌های اصلی مرحله */
  category: string;
  /** واژه‌ای که مرحله حول آن ساخته شده؛ از همه کاشی‌های مرحله استفاده می‌کند */
  anchorWord: string;
  /** مرحله آموزشی؛ برای مرحله ۱ فعال است */
  isTutorial?: boolean;
}

export interface Level {
  id: number;
  title: string;
  difficulty: Difficulty;
  /** حروف قابل استفاده در مرحله، با تکرار (مثلاً «کتاب» → ک، ت، ا، ب) */
  letters: string[];
  /** واژه‌های اصلی؛ تکمیل مرحله به آن‌ها وابسته است */
  targetWords: string[];
  /** واژه‌های امتیازی؛ پیشرفت مرحله به آن‌ها وابسته نیست */
  bonusWords: string[];
  minWordLength: number;
  maxWordLength: number;
  scoreReward: number;
  coinReward: number;
  hintCost: number;
  metadata: LevelMetadata;
}

/** یک کاشی حرف در صفحه بازی. id باعث می‌شود حروف تکراری مستقل انتخاب شوند. */
export interface LetterTileData {
  id: string;
  char: string;
}

export type WordKind = 'target' | 'bonus';

export interface FoundWord {
  word: string;
  kind: WordKind;
  score: number;
  coins: number;
  combo: number;
  /** واژه‌ای که با راهنما آشکار شده بود */
  revealed: boolean;
  foundAt: number;
}

export type WordRejectionReason =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_characters'
  | 'letters_unavailable'
  | 'not_in_dictionary'
  | 'already_found';

export type WordValidation =
  | { status: 'accepted'; word: string; kind: WordKind }
  | { status: 'rejected'; word: string; reason: WordRejectionReason };

export type HintType = 'reveal_letter' | 'reveal_word' | 'smart_help';

export interface HintRecord {
  type: HintType;
  word: string;
  /** برای راهنمای نوع حرف؛ null یعنی واژه کامل آشکار شده است */
  letterIndex: number | null;
  at: number;
}

export type SessionStatus = 'playing' | 'completed' | 'abandoned';

export interface GameSession {
  levelId: number;
  tiles: LetterTileData[];
  /** شناسه کاشی‌های انتخاب‌شده به ترتیب انتخاب */
  selection: string[];
  foundWords: FoundWord[];
  score: number;
  coinsEarned: number;
  combo: number;
  maxCombo: number;
  hints: HintRecord[];
  startedAt: number;
  finishedAt: number | null;
  status: SessionStatus;
}

export interface GameRewards {
  score: number;
  coins: number;
  targetWordsFound: number;
  bonusWordsFound: number;
  maxCombo: number;
}

/** پیشرفت بازیکن در یک مرحله */
export interface LevelProgress {
  foundTargets: number;
  totalTargets: number;
  foundBonus: number;
  totalBonus: number;
  isCompleted: boolean;
}

export interface LevelRecord {
  levelId: number;
  bestScore: number;
  completedAt: number;
  attempts: number;
}
