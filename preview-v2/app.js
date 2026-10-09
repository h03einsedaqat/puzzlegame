/* global localStorage */
import { PREVIEW_LEVELS } from './levels.js';
import {
  buildSelectionPathPoints,
  computeWheelGeometry,
  getTileAtPoint,
} from '../src/services/game/wheelGeometry.shared.js';
import {
  adoptSelection,
  createWheelInteractionState,
  wheelGestureCancel,
  wheelGestureDown,
  wheelGestureEnd,
  wheelGestureMove,
} from '../src/services/game/wheelInteraction.shared.js';

const app = document.querySelector('#app');
const DEFAULT_TILES = [
  { id: 'b-0', char: 'ب' },
  { id: 'h-0', char: 'ه' },
  { id: 'a-0', char: 'ا' },
  { id: 'r-0', char: 'ر' },
];
const DUPLICATE_TILES = [
  { id: 'm-0', char: 'م' },
  { id: 'a-0', char: 'ا' },
  { id: 'm-1', char: 'م' },
  { id: 'a-1', char: 'ا' },
  { id: 'n-0', char: 'ن' },
];
const DEFAULT_TARGETS = ['ابر', 'اره', 'بره', 'بهار'];
const DEFAULT_BONUS = ['بار'];
const DUPLICATE_TARGETS = ['مامان'];
const DUPLICATE_BONUS = ['مانا', 'نام'];
const MIN_LENGTH = 3;
const MAX_SELECTION = 9;
const DRAG_THRESHOLD = 8;
const MAX_LEVELS = PREVIEW_LEVELS.length;
const HINT_COST = 15;
const MIN_HINT_COST = PREVIEW_LEVELS.length
  ? Math.min(...PREVIEW_LEVELS.map(level => level.hintCost))
  : HINT_COST;
const LEVEL_TRANSITION_DELAY_MS = 2500;
const STARTING_COINS = 120;
const PREVIEW_COINS_KEY = 'kalamesaz.preview.coins';
const PREVIEW_WALLET_VERSION_KEY = 'kalamesaz.preview.walletVersion';
const PREVIEW_WALLET_VERSION = '2';

const savedSettings = readSettings();
const state = {
  view: 'home',
  level: 1,
  completed: Math.min(readNumber('kalamesaz.preview.completed', 0), MAX_LEVELS),
  coins: readPreviewCoins(),
  score: readNumber('kalamesaz.preview.score', 0),
  hearts: 5,
  sound: savedSettings.sound ?? true,
  haptics: savedSettings.haptics ?? true,
  reducedMotion: savedSettings.reducedMotion ?? false,
  mode: 'level',
  loadedLevelId: null,
  minWordLength: MIN_LENGTH,
  maxSelectionLength: MAX_SELECTION,
  hintCost: HINT_COST,
  completionPending: false,
  completionShouldAdvance: false,
  levelCompleteTimer: null,
  practiceDuplicates: false,
  tiles: DEFAULT_TILES,
  targets: DEFAULT_TARGETS,
  bonusWords: DEFAULT_BONUS,
  found: [],
  selection: [],
  lastAttempt: null,
  combo: 0,
  hintTileId: null,
  gesture: createWheelInteractionState(),
  geometry: null,
  activePointer: null,
  pointerStart: null,
  pointerStartTile: null,
  dragStarted: false,
  blockedByMultiTouch: false,
  activePointers: new Set(),
  toastTimer: null,
  feedbackTimer: null,
};

const iconMarkup = (name, extraClass = '') => {
  const body = {
    back: '<path d="M19 12H5m7 7-7-7 7-7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6-1.4-2.4L7.5 15a8 8 0 0 1 0-1.9L6.1 12l1.4-2.4 1.7.6a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.9Z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10m3-7.5c-.7-.8-1.7-1.2-3-1.2-1.7 0-2.8.8-2.8 1.9 0 3.1 5.8 1.2 5.8 4.2 0 1.1-1.1 1.9-2.9 1.9-1.4 0-2.5-.5-3.3-1.3"/>',
    heart: '<path d="M20.8 8.9c0 5.3-8.8 10.7-8.8 10.7S3.2 14.2 3.2 8.9A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 8.8 1.7Z"/>',
    star: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9L12 3Z"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    medal: '<circle cx="12" cy="14" r="6"/><path d="m8 3 4 6 4-6M12 12l1.2 2.2 2.5.4-1.8 1.7.4 2.5-2.3-1.2-2.3 1.2.4-2.5-1.8-1.7 2.5-.4L12 12Z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M4 10h16"/>',
    gift: '<rect x="3.5" y="9" width="17" height="12" rx="2"/><path d="M12 9v12M3 9h18v4H3zM12 9H8.5a2.5 2.5 0 1 1 2.3-3.5L12 9Zm0 0h3.5a2.5 2.5 0 1 0-2.3-3.5L12 9Z"/>',
    bulb: '<path d="M9 18h6m-5 3h4m-5.5-6.2A7 7 0 1 1 15.5 15c-.8.5-1.1 1.3-1.2 2H9.7c-.1-.7-.4-1.5-1.2-2Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.2 4.1L19 7"/>',
    sparkle: '<path d="m12 2 1.8 7.1L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-2.9L12 2Z"/>',
    lock: '<rect x="4.5" y="10" width="15" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    sound: '<path d="M4 10v4h3l4 3V7l-4 3H4Zm11-1a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/>',
    vibrate: '<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8v8m15-8v8"/>',
    eye: '<path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    chevron: '<path d="m10 5 7 7-7 7"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>',
  }[name] ?? '<circle cx="12" cy="12" r="8"/>';
  return `<svg class="${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
};

function readNumber(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw.trim() === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  } catch { return fallback; }
}
function readPreviewCoins() {
  try {
    const walletVersion = localStorage.getItem(PREVIEW_WALLET_VERSION_KEY);
    if (walletVersion !== PREVIEW_WALLET_VERSION) {
      // نسخهٔ قبلی Number(null) را صفر می‌خواند؛ یک اعتبار اولیهٔ حداقلی
      // برای پروفایل‌های قدیمی می‌گذاریم تا راهنمای ۱۵ سکه‌ای قابل استفاده باشد.
      const raw = localStorage.getItem(PREVIEW_COINS_KEY);
      const stored = raw === null ? STARTING_COINS : Number(raw);
      const valid = Number.isFinite(stored) && stored >= 0 ? stored : STARTING_COINS;
      const migrated = Math.max(MIN_HINT_COST, valid);
      localStorage.setItem(PREVIEW_COINS_KEY, String(migrated));
      localStorage.setItem(PREVIEW_WALLET_VERSION_KEY, PREVIEW_WALLET_VERSION);
      return migrated;
    }
    return readNumber(PREVIEW_COINS_KEY, STARTING_COINS);
  } catch { return STARTING_COINS; }
}
function readSettings() {
  try { return JSON.parse(localStorage.getItem('kalamesaz.preview.settings') ?? '{}'); }
  catch { return {}; }
}
function getPreviewLevel(levelId) {
  return PREVIEW_LEVELS.find(level => level.id === levelId) ?? PREVIEW_LEVELS[0];
}
function configurePreviewLevel(levelId) {
  const level = getPreviewLevel(levelId);
  if (!level) return null;
  const occurrences = new Map();
  state.level = level.id;
  state.loadedLevelId = level.id;
  state.tiles = level.letters.map(char => {
    const index = occurrences.get(char) ?? 0;
    occurrences.set(char, index + 1);
    return { id: `${char}-${index}`, char };
  });
  state.targets = [...level.targetWords];
  state.bonusWords = [...level.bonusWords];
  state.minWordLength = level.minWordLength;
  state.maxSelectionLength = Math.min(MAX_SELECTION, level.maxWordLength);
  state.hintCost = level.hintCost ?? HINT_COST;
  state.practiceDuplicates = false;
  return level;
}
function clearLevelCompletionTimer() {
  if (state.levelCompleteTimer !== null) clearTimeout(state.levelCompleteTimer);
  state.levelCompleteTimer = null;
  state.completionPending = false;
}
function resetPreviewLevelSession() {
  state.found = [];
  state.selection = [];
  state.lastAttempt = null;
  state.combo = 0;
  state.hintTileId = null;
  state.gesture = createWheelInteractionState();
  state.geometry = null;
  state.activePointer = null;
  state.pointerStart = null;
  state.pointerStartTile = null;
  state.dragStarted = false;
  state.blockedByMultiTouch = false;
  state.activePointers.clear();
  state.completionShouldAdvance = false;
}
function beginPreviewLevel(levelId, mode = 'level') {
  clearLevelCompletionTimer();
  const level = configurePreviewLevel(levelId);
  if (!level) return;
  resetPreviewLevelSession();
  state.mode = mode;
  state.view = 'game';
  renderApp();
  window.scrollTo({ top: 0, behavior: state.reducedMotion ? 'auto' : 'smooth' });
}
function persist() {
  try {
    localStorage.setItem('kalamesaz.preview.completed', String(state.completed));
    localStorage.setItem(PREVIEW_COINS_KEY, String(state.coins));
    localStorage.setItem(PREVIEW_WALLET_VERSION_KEY, PREVIEW_WALLET_VERSION);
    localStorage.setItem('kalamesaz.preview.score', String(state.score));
    localStorage.setItem('kalamesaz.preview.settings', JSON.stringify({ sound: state.sound, haptics: state.haptics, reducedMotion: state.reducedMotion }));
  } catch { /* private-browsing storage may be unavailable; the preview still works in memory */ }
}

function faNumber(value) {
  return String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}
function icon(name, cls = '') { return iconMarkup(name, cls); }
function makePill(name, value, className = '') {
  return `<div class="pill ${className}">${icon(name)}<strong>${faNumber(value)}</strong></div>`;
}
function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand"><div class="brand-mark">ک</div><div class="brand-copy"><strong>کلمه‌ساز</strong><small>بازی واژه‌ها · نسخهٔ ۲</small></div></div>
      <div class="top-stats">
        ${makePill('coin', state.coins, 'icon-gold')}
        ${makePill('heart', `${state.hearts}/5`, 'icon-heart')}
        <button class="icon-button" data-action="settings" aria-label="تنظیمات" title="تنظیمات">${icon('settings')}</button>
      </div>
    </header>`;
}
function renderBottomNav() {
  const pages = [
    ['home', 'grid', 'خانه'], ['game', 'play', 'بازی'], ['map', 'calendar', 'مراحل'], ['settings', 'settings', 'تنظیمات'],
  ];
  return `<nav class="bottom-nav" aria-label="ناوبری اصلی">${pages.map(([view, symbol, label]) => `
    <button class="nav-item ${state.view === view ? 'active' : ''}" data-view="${view}" aria-current="${state.view === view ? 'page' : 'false'}">
      ${icon(symbol)}<span>${label}</span>
    </button>`).join('')}</nav>`;
}
function difficultyLabel(difficulty) {
  return { easy: 'آسان', medium: 'متوسط', hard: 'سخت', expert: 'حرفه‌ای' }[difficulty] ?? 'مرحله';
}
function renderHome() {
  const progress = Math.round((state.completed / MAX_LEVELS) * 100);
  const gameFinished = state.completed >= MAX_LEVELS;
  const currentLevel = getPreviewLevel(gameFinished ? MAX_LEVELS : state.completed + 1);
  const heroAction = gameFinished ? 'data-view="map"' : 'data-action="play"';
  const heroActionLabel = gameFinished ? 'دیدن نقشهٔ مراحل' : 'ادامهٔ بازی';
  return `
    <section class="page">
      <div class="home-heading"><div><div class="date">${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date())}</div><h1>${gameFinished ? 'مسیر واژه‌ها کامل شد!' : 'سلام، آمادهٔ یک واژهٔ تازه‌ای؟'}</h1></div><span class="pill">${icon('sparkle')}<strong>${faNumber(4)}</strong><span>روز پیاپی</span></span></div>
      <div class="home-grid">
        <article class="card hero"><div class="hero-content">
          <div class="eyebrow"><span class="live-dot"></span>${gameFinished ? 'همهٔ مرحله‌ها تکمیل شد' : 'مسیر تو ادامه دارد'}</div>
          <div class="hero-main"><div class="level-number">${faNumber(currentLevel?.id ?? MAX_LEVELS)}</div><div class="hero-copy"><h2>${gameFinished ? 'تبریک، قهرمان!' : currentLevel?.title ?? 'مرحله'}</h2><p>${gameFinished ? `هر ${faNumber(MAX_LEVELS)} مرحله را با موفقیت پشت سر گذاشتی.` : `مرحلهٔ ${faNumber(currentLevel?.id ?? 1)} · ${difficultyLabel(currentLevel?.difficulty)} · ${faNumber(currentLevel?.targetWords.length ?? 0)} واژهٔ اصلی`}</p></div></div>
          <div class="progress-meta"><span>${gameFinished ? 'پایان مسیر' : 'پیشرفت مسیر'}</span><strong>${faNumber(state.completed)} از ${faNumber(MAX_LEVELS)} مرحله</strong></div>
          <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
          <button class="button button-primary" ${heroAction}>${icon(gameFinished ? 'grid' : 'play')} ${heroActionLabel}</button>
        </div></article>
        <div class="home-side">
          <article class="card card-pad daily-card"><div class="daily-head"><div class="daily-icon">${icon('calendar')}</div><div><h3>چالش روزانه</h3><p>یک پازل تازه، هر روز</p></div></div><div class="daily-foot"><span class="muted">${icon('gift')} جایزهٔ امروز</span><button class="button button-gold" data-action="daily">${icon('play')} شروع</button></div></article>
          <article class="card card-pad"><div class="card-title-row"><div class="card-title">${icon('medal')}<h3>پیشرفت تو</h3></div><span class="muted">این هفته</span></div><div style="display:flex;align-items:baseline;gap:8px;margin-top:14px"><strong style="font-size:28px">${faNumber(state.score)}</strong><span class="muted">امتیاز</span></div><div class="body-copy" style="margin-top:3px">${faNumber(state.found.length)} واژهٔ تازه در این جلسه</div></article>
        </div>
      </div>
      <div class="stats-row">
        <div class="stat-card"><span class="stat-icon" style="color:var(--gold)">${icon('coin')}</span><div><strong>${faNumber(state.coins)}</strong><small>سکه</small></div></div>
        <div class="stat-card"><span class="stat-icon" style="color:var(--purple)">${icon('star')}</span><div><strong>${faNumber(state.score)}</strong><small>امتیاز کل</small></div></div>
        <div class="stat-card"><span class="stat-icon" style="color:#ff7895">${icon('heart')}</span><div><strong>${faNumber(state.hearts)} از ۵</strong><small>قلب‌ها</small></div></div>
      </div>
      <div class="home-shortcuts">
        <button class="shortcut" data-view="map"><span>${icon('grid')}</span><span><strong>نقشهٔ مراحل</strong><small>${faNumber(state.completed)} از ${faNumber(MAX_LEVELS)} مرحله</small></span></button>
        <button class="shortcut" data-action="achievements"><span>${icon('medal')}</span><span><strong>دستاوردها</strong><small>مسیرهای تازه را باز کن</small></span></button>
      </div>
    </section>`;
}

function gameWordsMarkup(words, kind) {
  const found = state.found.filter(entry => entry.kind === kind).map(entry => entry.word);
  if (!words.length) return '';
  return words.map(word => `<div class="word-row ${found.includes(word) ? 'found' : ''}"><strong>${found.includes(word) ? word : Array.from(word).map(() => '•').join(' ')}</strong><small>${found.includes(word) ? 'پیدا شد' : `${faNumber(Array.from(word).length)} حرف`}</small></div>`).join('');
}
function gameStatsMarkup() {
  return `<span class="game-stat">${icon('star', 'gold')} ${faNumber(state.score)}</span><span class="game-stat">${icon('coin', 'gold')} ${faNumber(state.coins)}</span><span class="game-stat">${icon('heart', 'icon-heart')} ${faNumber(state.hearts)}/۵</span>`;
}
function renderGame() {
  const levelInfo = getPreviewLevel(state.level);
  const totalTargets = state.targets.length;
  const foundTargets = state.found.filter(entry => entry.kind === 'target').length;
  const ratio = totalTargets ? foundTargets / totalTargets : 0;
  return `
    <section class="page">
      <div class="game-header">
        <div class="game-title-wrap"><button class="icon-button" data-action="home" aria-label="بازگشت به خانه">${icon('back')}</button><div class="game-title"><strong>مرحلهٔ ${faNumber(state.level)} · ${levelInfo?.title ?? 'کلمه‌ساز'}</strong><small>${difficultyLabel(levelInfo?.difficulty)} · ${faNumber(state.targets.length)} واژهٔ اصلی</small></div></div>
        <div class="game-stats">${gameStatsMarkup()}</div>
        <div class="game-progress"><div class="progress-track"><div class="progress-fill" style="width:${ratio * 100}%"></div></div><small>${faNumber(foundTargets)} از ${faNumber(totalTargets)} واژه</small></div>
      </div>
      <div class="game-layout">
        <div class="game-main">
          <div class="word-board" id="wordBoard" data-state="${state.lastAttempt?.tone ?? 'idle'}" aria-label="جایگاه ساخت واژه"></div>
          <div class="feedback-toast ${state.lastAttempt?.tone ?? ''}" id="feedbackToast" role="status" aria-live="polite"></div>
          <div class="game-center">
            <div class="wheel-surface" id="wheelSurface" aria-label="چرخ حروف را بکش یا لمس کن">
              <svg class="wheel-svg" id="wheelSvg" aria-hidden="true">
                <circle class="wheel-orbit" id="orbitCircle" fill="rgba(20,28,50,.62)" stroke="#394665" stroke-width="1.2"></circle>
                <circle class="wheel-dots" id="dotCircle" fill="none" stroke="#394665" stroke-width="1" stroke-dasharray="2 8" opacity=".7"></circle>
                <circle id="progressTrack" fill="none" stroke="#303b59" stroke-width="4"></circle>
                <circle id="progressRing" fill="none" stroke="#35d2c0" stroke-width="4" stroke-linecap="round"></circle>
                <polyline id="selectionGlow" fill="none" stroke="#35d2c0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity="0"></polyline>
                <polyline id="selectionPath" fill="none" stroke="#6fe5d3" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0"></polyline>
              </svg>
              <div class="wheel-center"><strong id="wheelProgress">${faNumber(foundTargets)}/${faNumber(totalTargets)}</strong><small>پیداشده</small></div>
              <div id="wheelTiles"></div>
            </div>
          </div>
          <div class="wheel-controls">
            <button class="icon-button" data-action="clear" aria-label="پاک کردن واژه" title="پاک کردن">${icon('close')}</button>
            <button class="icon-button" data-action="hint" aria-label="راهنما، ${faNumber(state.hintCost)} سکه" title="راهنما"><span class="cost-badge">${icon('coin')} ${faNumber(state.hintCost)}</span>${icon('bulb')}</button>
            <button class="button button-primary" data-action="submit" aria-label="بررسی واژه ساخته‌شده">${icon('check')} بررسی</button>
          </div>
          <p class="wheel-instruction">حروف را لمس کن یا انگشتت را روی چرخ بکش</p>
        </div>
        <aside class="side-panel">
          <article class="card card-pad"><div class="card-title-row"><div class="card-title">${icon('grid')}<h3>واژه‌های مرحله</h3></div><span class="pill" style="min-height:30px;padding:0 10px">${faNumber(foundTargets)}/${faNumber(totalTargets)}</span></div><div class="word-list" id="targetWords">${gameWordsMarkup(state.targets, 'target')}</div><div class="bonus-divider"></div><div class="card-title" style="margin-top:12px">${icon('sparkle')}<h3>واژه‌های امتیازی</h3></div><div class="word-list" id="bonusWords">${gameWordsMarkup(state.bonusWords, 'bonus') || '<p class="side-note">یک واژهٔ تازه پیدا کن!</p>'}</div></article>
          <article class="card card-pad"><div class="card-title">${icon('info')}<h3>لمس و کشیدن</h3></div><p class="side-note" style="margin-top:10px">مسیر حروف روی UI به‌روزرسانی می‌شود. حرکت میان حروف با swept segment بررسی می‌شود؛ فضای خالی عمداً کاشی انتخاب نمی‌کند.</p>
            <details class="scenario-lab"><summary>تمرین لمس و سناریوها</summary><div class="scenario-buttons"><button data-scenario="sweep">پرش سریع A → D</button><button data-scenario="backtrack">برگشت A→B→C→B</button><button data-scenario="deadzone">بررسی dead zone</button><button data-scenario="cancel">لغو مسیر</button><button data-scenario="duplicates">حروف تکراری</button></div></details>
          </article>
        </aside>
      </div>
    </section>`;
}

function renderMap() {
  const current = Math.min(state.completed + 1, MAX_LEVELS);
  const chapters = Array.from({ length: 5 }, (_, index) => {
    const start = index * 10 + 1;
    const end = start + 9;
    const completed = Math.max(0, Math.min(10, state.completed - index * 10));
    const nodes = Array.from({ length: 10 }, (_node, offset) => {
      const level = start + offset;
      const isCompleted = level <= state.completed;
      const locked = level > current;
      const cls = isCompleted ? 'completed' : level === current ? 'current' : locked ? 'locked' : '';
      const content = isCompleted ? icon('check') : locked ? icon('lock') : faNumber(level);
      return `<button class="level-node ${cls}" data-level="${level}" aria-label="مرحلهٔ ${faNumber(level)}${locked ? '، قفل' : ''}" ${locked ? 'aria-disabled="true"' : ''}>${content}<small>${isCompleted ? '✓' : ''}</small></button>`;
    }).join('');
    return `<article class="card chapter-card"><div class="chapter-head"><div class="chapter-title"><span class="chapter-icon">${icon('grid')}</span><div><h3>فصل ${faNumber(index + 1)}</h3><small class="muted">مرحله‌های ${faNumber(start)} تا ${faNumber(end)}</small></div></div><div class="chapter-meta"><small>${faNumber(completed)} / ۱۰ تکمیل</small><div class="progress-track"><div class="progress-fill" style="width:${completed * 10}%"></div></div></div></div><div class="level-grid">${nodes}</div></article>`;
  }).join('');
  return `<section class="page"><div class="map-intro"><div><div class="section-kicker">مسیر پیشرفت</div><h1>نقشهٔ مرحله‌ها</h1><p>${faNumber(state.completed)} مرحله از ${faNumber(MAX_LEVELS)} مرحله تکمیل شده</p></div><span class="pill">${icon('heart', 'icon-heart')}<strong>${faNumber(state.hearts)} / ۵</strong><span>قلب</span></span></div><div class="chapter-list">${chapters}</div></section>`;
}

function renderSettings() {
  const toggleRow = (key, symbol, title, desc, on) => `<div class="settings-row"><span class="settings-icon">${icon(symbol)}</span><span class="settings-text"><strong>${title}</strong><small>${desc}</small></span><button class="switch" role="switch" aria-checked="${on}" data-toggle="${key}" aria-label="${title}"></button></div>`;
  return `<section class="page"><div class="map-intro"><div><div class="section-kicker">تجربهٔ بازی</div><h1>تنظیمات</h1><p>همان کنترل‌های آشنا، با ظاهر تازه و ساده‌تر.</p></div></div><div class="settings-grid"><article class="card card-pad settings-card"><div class="card-title-row"><div class="card-title">${icon('settings')}<h3>تنظیمات بازی</h3></div></div>${toggleRow('sound', 'sound', 'صدای بازی', 'افکت‌های لمس و واژه‌های درست', state.sound)}${toggleRow('haptics', 'vibrate', 'بازخورد لمسی', 'لرزش کوتاه هنگام انتخاب حرف', state.haptics)}${toggleRow('reducedMotion', 'eye', 'کاهش حرکت', 'حرکت‌های آرام‌تر و کوتاه‌تر', state.reducedMotion)}</article><div class="stack"><article class="card card-pad"><div class="card-title">${icon('info')}<h3>دربارهٔ نسخهٔ ۲</h3></div><p class="body-copy" style="margin-top:11px">کلمه‌ساز با چرخ حروف روان‌تر، مسیر دیداری روشن، حالت شب و بازخوردهای دقیق‌تر.</p><p class="muted" style="margin-top:10px;font-size:11px">نسخهٔ ۲.۰.۰ · پیش‌نمایش مستقل</p></article><article class="card card-pad"><div class="card-title">${icon('grid')}<h3>میانبرها</h3></div><div class="settings-links" style="margin-top:12px"><button class="settings-link" data-view="map">${icon('calendar')}<span>نقشه و فصل‌ها</span>${icon('chevron')}</button><button class="settings-link" data-action="home">${icon('grid')}<span>بازگشت به خانه</span>${icon('chevron')}</button></div><div class="settings-note">تنظیم‌های این پیش‌نمایش در مرورگر ذخیره می‌شوند؛ داده‌های اپ native دست‌نخورده‌اند.</div></article></div></div></section>`;
}

function renderApp() {
  if (!app) return;
  const page = state.view === 'game' ? renderGame() : state.view === 'map' ? renderMap() : state.view === 'settings' ? renderSettings() : renderHome();
  app.dataset.screen = state.view;
  app.innerHTML = `<div class="app-frame">${renderTopbar()}<main id="pageContent">${page}</main></div>${renderBottomNav()}<div id="live-region"></div>`;
  if (state.view === 'game') {
    bindWheel();
    renderBoard();
  }
}

function setView(view) {
  if (view === 'game' && state.completed >= MAX_LEVELS && state.view !== 'game') {
    state.view = 'map';
    renderApp();
    showPageToast('بازی را کامل کردی؛ برای بازپخش، مرحله‌ای را از نقشه انتخاب کن.');
    return;
  }
  if (state.view === 'game' && view !== 'game' && state.completionPending) {
    clearLevelCompletionTimer();
    state.completionShouldAdvance = false;
    state.loadedLevelId = null;
  }
  if (view === 'game' && state.loadedLevelId === null && state.mode === 'level') {
    state.level = Math.min(state.completed + 1, MAX_LEVELS);
  }
  if (view === 'game' && state.loadedLevelId !== state.level) {
    configurePreviewLevel(state.level);
    resetPreviewLevelSession();
  }
  if (view === 'game') state.hintTileId = null;
  state.view = view;
  renderApp();
  window.scrollTo({ top: 0, behavior: state.reducedMotion ? 'auto' : 'smooth' });
}
function getTileChar(id) { return state.tiles.find(tile => tile.id === id)?.char ?? ''; }
function getWord(selection = state.selection) { return selection.map(getTileChar).join(''); }
function updateInteractionSelection(next) {
  const ids = Array.isArray(next) ? next : [...next];
  if (ids.length > 0 && state.lastAttempt) state.lastAttempt = null;
  state.selection = ids;
  if (state.gesture.phase === 'idle') state.gesture = adoptSelection(state.gesture, state.selection);
  renderBoard();
}
function setPath(points, visible) {
  const surface = document.querySelector('#wheelSurface');
  const glow = document.querySelector('#selectionGlow');
  const line = document.querySelector('#selectionPath');
  if (!surface || !glow || !line) return;
  glow.setAttribute('points', points);
  line.setAttribute('points', points);
  glow.style.opacity = visible ? '.16' : '0';
  line.style.opacity = visible ? '1' : '0';
}
function updateTileStyles() {
  document.querySelectorAll('.wheel-tile').forEach(button => {
    const id = button.dataset.tileId;
    const selectedIndex = state.selection.indexOf(id);
    button.disabled = state.completionPending;
    button.classList.toggle('selected', selectedIndex !== -1);
    button.classList.toggle('hinted', id === state.hintTileId && selectedIndex === -1);
    const badge = button.querySelector('.tile-step');
    if (selectedIndex !== -1) {
      if (!badge) button.insertAdjacentHTML('beforeend', `<span class="tile-step">${faNumber(selectedIndex + 1)}</span>`);
      else badge.textContent = faNumber(selectedIndex + 1);
    } else if (badge) badge.remove();
  });
}
function updateGameStats() {
  const stats = document.querySelectorAll('.game-stats .game-stat');
  const values = [state.score, state.coins];
  values.forEach((value, index) => {
    const textNode = stats[index]?.lastChild;
    if (textNode?.nodeType === 3) textNode.textContent = ` ${faNumber(value)}`;
  });
  const walletValue = document.querySelector('.top-stats .pill.icon-gold strong');
  if (walletValue) walletValue.textContent = faNumber(state.coins);
}
function renderBoard() {
  const board = document.querySelector('#wordBoard');
  const foundCount = document.querySelector('#wheelProgress');
  if (!board) return;
  updateGameStats();
  const attempted = state.selection.length > 0 ? state.selection.map(getTileChar) : state.lastAttempt ? Array.from(state.lastAttempt.word) : [];
  const totalSlots = Math.max(3, Math.min(9, Math.max(state.targets.reduce((max, word) => Math.max(max, Array.from(word).length), 3), attempted.length)));
  const feedbackState = state.selection.length > 0 ? 'idle' : state.lastAttempt?.tone ?? 'idle';
  board.dataset.state = feedbackState;
  board.innerHTML = Array.from({ length: totalSlots }, (_, index) => {
    const char = attempted[index] ?? '';
    return `<button class="slot ${char ? 'filled' : index === attempted.length ? 'slot-next' : ''}" data-slot-index="${index}" aria-label="${char ? `حرف ${char}، برداشتن` : 'جای خالی'}" ${char && state.selection.length > 0 ? '' : 'disabled'}>${char}</button>`;
  }).join('');
  if (foundCount) {
    const foundTargets = state.found.filter(entry => entry.kind === 'target').length;
    foundCount.textContent = `${faNumber(foundTargets)}/${faNumber(state.targets.length)}`;
  }
  updateTileStyles();
  updateFoundList();
  updateProgressArc();
  const submitButton = document.querySelector('[data-action="submit"]');
  const clearButton = document.querySelector('[data-action="clear"]');
  const hintButton = document.querySelector('[data-action="hint"]');
  if (submitButton) submitButton.disabled = state.completionPending || state.selection.length === 0;
  if (clearButton) clearButton.disabled = state.completionPending || state.selection.length === 0;
  if (hintButton) hintButton.disabled = state.completionPending;
  if (state.geometry) {
    const points = buildSelectionPathPoints(state.geometry, state.selection, null);
    setPath(points, state.dragStarted && state.selection.length > 0);
  }
}
function updateFoundList() {
  const targetEl = document.querySelector('#targetWords');
  const bonusEl = document.querySelector('#bonusWords');
  if (targetEl) targetEl.innerHTML = gameWordsMarkup(state.targets, 'target');
  if (bonusEl) bonusEl.innerHTML = gameWordsMarkup(state.bonusWords, 'bonus') || '<p class="side-note">یک واژهٔ تازه پیدا کن!</p>';
  const progressText = document.querySelector('.game-progress small');
  if (progressText) {
    const foundTargets = state.found.filter(entry => entry.kind === 'target').length;
    progressText.textContent = `${faNumber(foundTargets)} از ${faNumber(state.targets.length)} واژه`;
  }
  const progressFill = document.querySelector('.game-progress .progress-fill');
  if (progressFill) progressFill.style.width = `${state.targets.length ? state.found.filter(entry => entry.kind === 'target').length / state.targets.length * 100 : 0}%`;
}
function renderToast(tone, title, word = '', detail = '', durationMs = 1850) {
  const toast = document.querySelector('#feedbackToast');
  const region = document.querySelector('#live-region');
  if (!toast) return;
  if (state.toastTimer) clearTimeout(state.toastTimer);
  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  const symbol = tone === 'error' ? 'info' : tone === 'bonus' ? 'sparkle' : 'check';
  toast.className = `feedback-toast ${tone}`;
  toast.innerHTML = `<span class="toast-icon">${icon(symbol)}</span><span class="toast-copy"><strong>${title}</strong><small>${word ? `<span class="toast-word">«${word}»</span>${detail ? ' · ' : ''}` : ''}${detail}</small></span>`;
  if (region) region.textContent = `${title}${word ? `، ${word}` : ''}`;
  requestAnimationFrame(() => toast.classList.add('visible'));
  state.toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    state.feedbackTimer = setTimeout(() => { if (region) region.textContent = ''; }, 160);
  }, durationMs);
}
function reasonFor(word) {
  const length = Array.from(word).length;
  if (length < state.minWordLength) return `واژه باید دست‌کم ${faNumber(state.minWordLength)} حرف داشته باشد.`;
  if (length > state.maxSelectionLength) return 'این واژه از حروف این مرحله بلندتر است.';
  if (state.found.some(entry => entry.word === word)) return 'این واژه را قبلاً پیدا کرده‌ای.';
  if (![...state.targets, ...state.bonusWords].includes(word)) return 'این واژه در واژه‌نامهٔ این مرحله نیست؛ ترکیب دیگری را امتحان کن.';
  return null;
}
function finishPreviewCompletion() {
  if (!state.completionPending) return;
  state.levelCompleteTimer = null;
  state.completionPending = false;
  const completedLevel = state.level;

  if (state.mode === 'daily') {
    state.mode = 'level';
    state.view = 'home';
    state.loadedLevelId = null;
    state.completionShouldAdvance = false;
    renderApp();
    showPageToast('چالش روزانه را کامل کردی؛ آفرین!', 'success');
    return;
  }

  if (completedLevel >= MAX_LEVELS) {
    state.completed = MAX_LEVELS;
    state.mode = 'level';
    state.view = 'home';
    state.level = MAX_LEVELS;
    state.loadedLevelId = null;
    state.completionShouldAdvance = false;
    persist();
    renderApp();
    showPageToast(`تبریک! همهٔ ${faNumber(MAX_LEVELS)} مرحله تمام شد؛ بازی را کامل کردی.`, 'success');
    return;
  }

  if (!state.completionShouldAdvance) {
    state.mode = 'level';
    state.view = 'home';
    state.loadedLevelId = null;
    state.completionShouldAdvance = false;
    persist();
    renderApp();
    showPageToast(`مرحلهٔ ${faNumber(completedLevel)} دوباره کامل شد.`, 'success');
    return;
  }

  const nextLevel = getPreviewLevel(completedLevel + 1);
  if (!nextLevel) {
    state.completed = MAX_LEVELS;
    state.mode = 'level';
    state.view = 'home';
    state.loadedLevelId = null;
    state.completionShouldAdvance = false;
    persist();
    renderApp();
    showPageToast('تبریک! بازی را کامل کردی.', 'success');
    return;
  }

  beginPreviewLevel(nextLevel.id, 'level');
  renderToast('success', `مرحلهٔ ${faNumber(nextLevel.id)} شروع شد`, nextLevel.title, 'واژه‌های این مرحله را پیدا کن.');
}
function submitWord({ fromDrag = false } = {}) {
  if (state.completionPending) return;
  const word = getWord();
  if (!word) return;
  const length = Array.from(word).length;
  if (fromDrag && length < state.minWordLength) return;
  const reason = reasonFor(word);
  if (reason) {
    state.lastAttempt = { word, tone: 'error' };
    state.selection = [];
    state.hintTileId = null;
    state.gesture = adoptSelection(state.gesture, []);
    renderBoard();
    renderToast('error', reason, word);
    vibrate([12, 24, 12]);
    return;
  }
  const kind = state.targets.includes(word) ? 'target' : 'bonus';
  const score = length * 10 + Math.max(0, state.combo - 1) * 4;
  const coins = kind === 'bonus' ? length + 2 : length;
  state.found.push({ word, kind, score, coins });
  state.score += score;
  state.coins += coins;
  state.combo += 1;
  const allTargetsFound = kind === 'target' && state.targets.every(target => state.found.some(entry => entry.word === target));
  if (allTargetsFound) {
    if (state.mode === 'level') {
      state.completionShouldAdvance = true;
      state.completed = Math.min(MAX_LEVELS, Math.max(state.completed, state.level));
    }
    state.completionPending = true;
  }
  state.lastAttempt = { word, tone: 'success' };
  state.selection = [];
  state.hintTileId = null;
  state.gesture = adoptSelection(state.gesture, []);
  persist();
  renderBoard();

  if (allTargetsFound) {
    const title = state.mode === 'daily'
      ? 'چالش روزانه را کامل کردی!'
      : state.level >= MAX_LEVELS
        ? 'تبریک! بازی تمام شد'
        : `آفرین! مرحلهٔ ${faNumber(state.level)} کامل شد`;
    const detail = state.mode === 'daily'
      ? 'به خانه برمی‌گردی…'
      : state.level >= MAX_LEVELS
        ? 'همهٔ مرحله‌ها را پیدا کردی؛ بازگشت به صفحهٔ اصلی…'
        : `مرحلهٔ ${faNumber(state.level + 1)} تا چند لحظهٔ دیگر شروع می‌شود…`;
    renderToast('success', title, word, detail, LEVEL_TRANSITION_DELAY_MS);
    state.levelCompleteTimer = setTimeout(finishPreviewCompletion, LEVEL_TRANSITION_DELAY_MS);
  } else {
    const title = kind === 'bonus' ? 'واژهٔ امتیازی!' : state.combo > 1 ? `کمبو ×${faNumber(state.combo)}` : 'آفرین! واژه پیدا شد';
    renderToast(kind === 'bonus' ? 'bonus' : 'success', title, word, `+${faNumber(score)} امتیاز · +${faNumber(coins)} سکه`);
  }
  vibrate([16, 28, 18]);
}
function vibrate(pattern) {
  if (state.haptics && navigator.vibrate) navigator.vibrate(pattern);
}
function useHint() {
  if (state.completionPending) return;
  const remainingTargets = state.targets.filter(word => !state.found.some(entry => entry.word === word));
  if (remainingTargets.length === 0) {
    renderToast('success', 'همهٔ واژه‌های اصلی پیدا شده‌اند', '', 'برای ادامه، یک واژهٔ امتیازی پیدا کن.');
    return;
  }

  const selectedWord = getWord();
  if (selectedWord && remainingTargets.includes(selectedWord)) {
    renderToast('success', 'واژه آمادهٔ ثبت است', selectedWord, 'برای ثبت واژه دکمهٔ «بررسی» را بزن.');
    return;
  }

  // اگر بازیکن در حال ساخت واژه است، راهنما باید ادامهٔ همان پیشوند را بدهد.
  const matchingTarget = remainingTargets.find(word =>
    word.startsWith(selectedWord) && Array.from(word).length > state.selection.length,
  );
  if (state.selection.length > 0 && !matchingTarget) {
    renderToast('error', 'انتخاب فعلی با راهنما هماهنگ نیست', '', 'مسیر را پاک کن و راهنما را دوباره بزن؛ سکه‌ای کم نمی‌شود.');
    return;
  }

  const target = matchingTarget ?? remainingTargets[0];
  const nextLetter = Array.from(target ?? '')[state.selection.length] ?? '';
  if (!nextLetter) {
    renderToast('error', 'راهنما در دسترس نیست', '', 'واژهٔ دیگری را انتخاب کن.');
    return;
  }
  const hintCost = state.hintCost ?? HINT_COST;
  if (state.coins < hintCost) {
    renderToast('error', 'سکهٔ کافی نداری', '', 'یک واژهٔ امتیازی پیدا کن و دوباره راهنما بگیر.');
    return;
  }

  // در حروف تکراری، کاشی آزاد بعدی را برمی‌گزینیم؛ هیچ سکه‌ای پیش از یافتن
  // کاشی معتبر کسر نمی‌شود.
  const hintedTile = state.tiles.find(tile =>
    tile.char === nextLetter && !state.selection.includes(tile.id),
  );
  if (!hintedTile) {
    renderToast('error', 'کاشی راهنما پیدا نشد', '', 'انتخاب را پاک کن و دوباره تلاش کن؛ سکه‌ای کم نمی‌شود.');
    return;
  }

  state.hintTileId = hintedTile.id;
  state.coins -= hintCost;
  persist();
  renderBoard();
  renderToast('bonus', 'راهنمای حرف بعدی فعال شد', nextLetter, 'کاشی طلایی را لمس کن یا انگشتت را به آن بکش.');
}
function selectByTap(id) {
  if (state.completionPending || state.selection.length >= state.maxSelectionLength || state.selection.includes(id)) return;
  state.lastAttempt = null;
  state.selection = [...state.selection, id];
  state.gesture = adoptSelection(state.gesture, state.selection);
  renderBoard();
  vibrate(8);
}
function removeSlot(index) {
  if (!state.selection[index]) return;
  state.selection = state.selection.slice(0, index);
  state.lastAttempt = null;
  state.gesture = adoptSelection(state.gesture, state.selection);
  renderBoard();
}
function clearSelection() {
  if (state.selection.length === 0) return;
  state.selection = [];
  state.lastAttempt = null;
  state.hintTileId = null;
  state.gesture = adoptSelection(state.gesture, []);
  setPath('', false);
  renderBoard();
}
function bindWheel() {
  const surface = document.querySelector('#wheelSurface');
  const tilesHost = document.querySelector('#wheelTiles');
  if (!surface || !tilesHost) return;
  const diameter = Math.floor(Math.min(surface.clientWidth, 350));
  surface.style.width = `${diameter}px`;
  surface.style.height = `${diameter}px`;
  state.geometry = computeWheelGeometry({ tiles: state.tiles, diameter, preferredTileSize: diameter * (state.tiles.length > 5 ? .185 : .21) });
  state.gesture = createWheelInteractionState();
  state.activePointer = null;
  state.pointerStart = null;
  state.pointerStartTile = null;
  state.dragStarted = false;
  state.blockedByMultiTouch = false;
  drawWheelStatic(state.geometry);
  tilesHost.innerHTML = state.geometry.positions.map(position => `
    <button class="wheel-tile" style="--tile-size:${state.geometry.tileSize}px;left:${position.x}px;top:${position.y}px" data-tile-id="${position.id}" aria-label="حرف ${position.char}" type="button">${position.char}</button>`).join('');

  surface.addEventListener('pointerdown', event => {
    if (state.completionPending) return;
    const tileButton = event.target.closest?.('.wheel-tile');
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (state.activePointer !== null && event.pointerId !== state.activePointer) {
      state.activePointers.add(event.pointerId);
      cancelActiveGesture('multi-touch');
      state.blockedByMultiTouch = true;
      return;
    }
    state.activePointers.add(event.pointerId);
    if (state.blockedByMultiTouch || !tileButton) return;
    const point = pointerPoint(event, surface);
    const tileId = getTileAtPoint(state.geometry, point);
    if (tileId === null) return;
    state.activePointer = event.pointerId;
    state.pointerStart = point;
    state.pointerStartTile = tileId;
    state.dragStarted = false;
    state.gesture = wheelGestureDown(state.geometry, state.selection.slice(), point).state;
    try { surface.setPointerCapture(event.pointerId); } catch { /* capture can fail in older preview browsers */ }
  });

  surface.addEventListener('pointermove', event => {
    if (event.pointerId !== state.activePointer || state.blockedByMultiTouch) return;
    const point = pointerPoint(event, surface);
    if (!state.dragStarted && distance(state.pointerStart, point) >= DRAG_THRESHOLD) {
      state.dragStarted = true;
      state.lastAttempt = null;
      if (!state.reducedMotion) surface.classList.add('is-dragging');
      renderBoard();
    }
    if (!state.dragStarted) return;
    const moved = wheelGestureMove(state.gesture, state.geometry, point);
    state.gesture = moved.state;
    if (moved.selection !== null) updateInteractionSelection(moved.selection);
    setPath(buildSelectionPathPoints(state.geometry, state.selection, point), state.selection.length > 0);
  });

  surface.addEventListener('pointerup', event => {
    if (event.pointerId !== state.activePointer) {
      state.activePointers.delete(event.pointerId);
      if (state.activePointers.size === 0) state.blockedByMultiTouch = false;
      return;
    }
    const point = pointerPoint(event, surface);
    const dragWasStarted = state.dragStarted;
    if (dragWasStarted) {
      const ended = wheelGestureEnd(state.gesture, state.geometry, point);
      state.gesture = ended.state;
      if (ended.selection !== null) updateInteractionSelection(ended.selection);
      const released = ended.released ?? state.selection;
      state.activePointer = null;
      state.pointerStart = null;
      state.pointerStartTile = null;
      state.dragStarted = false;
      surface.classList.remove('is-dragging');
      setPath('', false);
      if (released.length >= state.minWordLength) submitWord({ fromDrag: true });
      else renderBoard();
    } else {
      const tappedId = state.pointerStartTile;
      state.activePointer = null;
      state.pointerStart = null;
      state.pointerStartTile = null;
      if (tappedId) selectByTap(tappedId);
    }
    state.activePointers.delete(event.pointerId);
    if (state.activePointers.size === 0) state.blockedByMultiTouch = false;
    try { if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId); } catch { /* no-op */ }
  });

  surface.addEventListener('pointercancel', event => {
    if (event.pointerId === state.activePointer) cancelActiveGesture('pointer-cancel');
    state.activePointers.delete(event.pointerId);
    if (state.activePointers.size === 0) state.blockedByMultiTouch = false;
  });
  surface.addEventListener('lostpointercapture', event => {
    if (event.pointerId === state.activePointer) cancelActiveGesture('lost-capture');
  });
  surface.addEventListener('contextmenu', event => event.preventDefault());
  surface.addEventListener('keydown', event => {
    const tile = event.target.closest?.('.wheel-tile');
    if (!tile || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    selectByTap(tile.dataset.tileId);
  });
}
function pointerPoint(event, surface) {
  const rect = surface.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function distance(a, b) { if (!a || !b) return 0; return Math.hypot(a.x - b.x, a.y - b.y); }
function cancelActiveGesture(reason) {
  if (state.activePointer === null && state.gesture.phase === 'idle') return;
  const cancelled = wheelGestureCancel(state.gesture);
  state.gesture = cancelled.state;
  if (cancelled.selection !== null) updateInteractionSelection(cancelled.selection);
  state.activePointer = null;
  state.pointerStart = null;
  state.pointerStartTile = null;
  state.dragStarted = false;
  document.querySelector('#wheelSurface')?.classList.remove('is-dragging');
  setPath('', false);
  if (reason === 'multi-touch') renderToast('error', 'حرکت لغو شد', '', 'در هر نوبت فقط یک انگشت را روی چرخ نگه دار.');
  renderBoard();
}
function drawWheelStatic(geometry) {
  const surface = document.querySelector('#wheelSurface');
  const svg = document.querySelector('#wheelSvg');
  const center = document.querySelector('.wheel-center');
  if (!surface || !svg || !center) return;
  svg.setAttribute('viewBox', `0 0 ${geometry.diameter} ${geometry.diameter}`);
  for (const id of ['orbitCircle', 'dotCircle', 'progressTrack', 'progressRing']) {
    document.getElementById(id).setAttribute('cx', geometry.center.x);
    document.getElementById(id).setAttribute('cy', geometry.center.y);
  }
  const orbitRadius = Math.max(geometry.tileSize, geometry.diameter / 2 - geometry.tileSize / 2);
  document.getElementById('orbitCircle').setAttribute('r', orbitRadius);
  document.getElementById('dotCircle').setAttribute('r', Math.max(geometry.tileSize * .8, geometry.diameter / 2 - geometry.tileSize * 1.2));
  const progressRadius = Math.min(42, Math.max(34, geometry.diameter * .145));
  const circumference = 2 * Math.PI * progressRadius;
  for (const id of ['progressTrack', 'progressRing']) document.getElementById(id).setAttribute('r', progressRadius);
  const progressRing = document.getElementById('progressRing');
  progressRing.setAttribute('stroke-dasharray', String(circumference));
  progressRing.setAttribute('transform', `rotate(-90 ${geometry.center.x} ${geometry.center.y})`);
  document.getElementById('wheelCenter')?.remove();
  center.style.width = `${Math.min(88, geometry.diameter * .27)}px`;
  center.style.height = center.style.width;
  updateFoundList();
  updateTileStyles();
}
function updateProgressArc() {
  const progress = state.targets.length ? state.found.filter(entry => entry.kind === 'target').length / state.targets.length : 0;
  const ring = document.querySelector('#progressRing');
  if (ring) {
    const radius = Number(ring.getAttribute('r'));
    const circumference = 2 * Math.PI * radius;
    ring.setAttribute('stroke-dashoffset', String(circumference * (1 - progress)));
  }
}
function handleSlotClick(event) {
  const slot = event.target.closest?.('.slot');
  if (slot && !slot.disabled && state.selection.length > 0) removeSlot(Number(slot.dataset.slotIndex));
}
function showPageToast(title, tone = 'success') {
  const region = document.querySelector('#live-region');
  if (region) region.innerHTML = `<div class="feedback-toast ${tone} visible"><span class="toast-icon">${icon(tone === 'error' ? 'info' : 'check')}</span><span class="toast-copy"><strong>${title}</strong></span></div>`;
  setTimeout(() => { const current = document.querySelector('#live-region'); if (current) current.innerHTML = ''; }, 2000);
}
function runTouchScenario(name) {
  if (!state.geometry) return;
  const geometry = state.geometry;
  const points = geometry.positions;
  const nearest = (id) => points.find(position => position.id === id);
  if (name === 'duplicates') {
    state.practiceDuplicates = !state.practiceDuplicates;
    state.tiles = state.practiceDuplicates ? DUPLICATE_TILES : DEFAULT_TILES;
    state.targets = state.practiceDuplicates ? DUPLICATE_TARGETS : DEFAULT_TARGETS;
    state.bonusWords = state.practiceDuplicates ? DUPLICATE_BONUS : DEFAULT_BONUS;
    state.found = [];
    state.selection = [];
    state.level = state.practiceDuplicates ? 2 : 1;
    state.gesture = createWheelInteractionState();
    renderApp();
    renderToast('bonus', state.practiceDuplicates ? 'دو کاشی مستقل، یک نویسه' : 'مرحلهٔ اصلی برگشت', state.practiceDuplicates ? 'مامان' : 'بهار', 'هر تکرار شناسه و جایگاه مستقل دارد.');
    return;
  }
  clearSelection();
  if (name === 'sweep') {
    const lineGeometry = {
      ...geometry,
      positions: geometry.positions.slice(0, 4).map((position, index) => ({ ...position, x: 24 + index * 40, y: 50 })),
      diameter: 100,
      center: { x: 50, y: 50 },
      interactionRadius: 9,
      touchRadius: 9,
      visualRadius: 8,
    };
    let machine = wheelGestureDown(lineGeometry, [], { x: 24, y: 50 }).state;
    const jumped = wheelGestureMove(machine, lineGeometry, { x: 144, y: 50 });
    machine = jumped.state;
    state.selection = [...machine.selection];
    state.gesture = machine;
    renderBoard();
    renderToast('success', `یک segment، ${faNumber(state.selection.length)} hit مرتب`, state.selection.map(getTileChar).join(''), 'hitها طبق t مرتب شدند.');
    return;
  }
  const start = nearest('b-0') ?? points[0];
  const second = nearest('h-0') ?? points[1];
  const third = nearest('a-0') ?? points[2];
  const fourth = nearest('r-0') ?? points[3];
  if (!start || !second || !third || !fourth) return;
  let machine = wheelGestureDown(geometry, [], start).state;
  machine = wheelGestureMove(machine, geometry, second).state;
  if (name === 'backtrack') {
    machine = wheelGestureMove(machine, geometry, third).state;
    machine = wheelGestureMove(machine, geometry, second).state;
    state.selection = [...machine.selection];
    state.gesture = machine;
    renderBoard();
    renderToast('success', 'حذف انتهای مسیر', getWord(), 'برگشت به کاشی قبلی؛ حروف قدیمی‌تر حفظ شدند.');
  } else if (name === 'deadzone') {
    const mid = { x: (start.x + second.x) / 2, y: (start.y + second.y) / 2 };
    const movement = wheelGestureMove(wheelGestureDown(geometry, [], start).state, geometry, mid);
    state.selection = [...movement.state.selection];
    state.gesture = movement.state;
    renderBoard();
    renderToast('success', 'فضای میانی نادیده گرفته شد', getWord(), `حاشیهٔ dead zone: ${faNumber(Math.round(geometry.deadZone))}px.`);
  } else if (name === 'cancel') {
    const cancelled = wheelGestureCancel(machine);
    state.selection = [...cancelled.state.selection];
    state.gesture = cancelled.state;
    renderBoard();
    renderToast('error', 'مسیر لغو شد', '', 'snapshot پیش از drag برگردانده شد؛ submit انجام نشد.');
  }
}

app.addEventListener('click', event => {
  const viewButton = event.target.closest?.('[data-view]');
  if (viewButton) { setView(viewButton.dataset.view); return; }
  const levelButton = event.target.closest?.('[data-level]');
  if (levelButton) {
    const level = Number(levelButton.dataset.level);
    if (level > state.completed + 1) showPageToast('اول مرحله‌های قبلی را کامل کن.', 'error');
    else beginPreviewLevel(level, 'level');
    return;
  }
  const toggle = event.target.closest?.('[data-toggle]');
  if (toggle) {
    const key = toggle.dataset.toggle;
    if (key in state) state[key] = !state[key];
    persist();
    renderApp();
    return;
  }
  const scenario = event.target.closest?.('[data-scenario]');
  if (scenario) { runTouchScenario(scenario.dataset.scenario); return; }
  const slot = event.target.closest?.('.slot');
  if (slot) { handleSlotClick(event); return; }
  const action = event.target.closest?.('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'settings') setView('settings');
  else if (action === 'home') setView('home');
  else if (action === 'play') {
    if (state.completed >= MAX_LEVELS) {
      setView('map');
      showPageToast('بازی را کامل کردی؛ مرحله‌ای را برای بازپخش از نقشه انتخاب کن.');
    } else beginPreviewLevel(state.completed + 1, 'level');
  }
  else if (action === 'daily') beginPreviewLevel(1, 'daily');
  else if (action === 'clear') clearSelection();
  else if (action === 'submit') submitWord();
  else if (action === 'hint') useHint();
  else if (action === 'achievements') showPageToast('دستاوردها به‌زودی در نسخهٔ کامل پیش‌نمایش اضافه می‌شوند.');
});

function handleKeyboard(event) {
  if (state.view !== 'game' || state.completionPending) return;
  if (event.key === 'Escape') { cancelActiveGesture('escape'); return; }
  if (event.key === 'Backspace') { if (state.selection.length) removeSlot(state.selection.length - 1); return; }
  if (event.key === 'Enter') submitWord();
}
document.addEventListener('keydown', handleKeyboard);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') cancelActiveGesture('background');
});
window.addEventListener('blur', () => cancelActiveGesture('background'));
window.addEventListener('pagehide', () => cancelActiveGesture('navigation'));

renderApp();
