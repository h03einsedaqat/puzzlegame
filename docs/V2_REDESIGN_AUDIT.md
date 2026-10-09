# ممیزی و نقشه اجرای نسخه ۲.۰.۰

- تاریخ ممیزی: ۲۰۲۶-۱۰-۰۸
- مبنای مخزن: `082ef9c41eb0c7c71c4b33c616899be3849ef65b`
- هدف: بازطراحی هدفمند بدون جایگزینی معماری سالم بازی.

## دامنه ممیزی

بررسی اولیه شامل `App.tsx`، `package.json` و lockfile، Babel/Metro/Jest، `src/context/`، `src/services/` و موتور/اعتبارسنجی لمس، `src/hooks/`، کامپوننت‌های بازی و UI، همه Screenها، Theme، Constants، داده مراحل/واژه‌نامه، Typeها، آزمون‌های unit/integration، Preview قدیمی، Android Gradle/Manifest/Application، شناسه بسته و نسخه‌ها بود. مخزن در شروع این کار روی شاخه `arena/c010600c-puzzlegame` و بدون تغییر محلی بود.

## یافته‌ها: مسئله، علت، راه‌حل هدفمند

| فایل/بخش | مسئله مشاهده‌شده | علت فنی/UX | راه‌حل نسخه ۲ |
|---|---|---|---|
| `src/services/game/wheelGesture.ts` | فقط نقطه فعلی به کاشی نگاشت می‌شود؛ شعاع دیداری و تعاملی مجزا نیستند | `getTileAtPoint` در هر نمونه، یک tile می‌دهد و مسیر بین دو نمونه دیده نمی‌شود | محاسبه pure و قابل‌آزمون `getTilesCrossedBySegment` با projection و `t∈[0,1]`؛ حفظ فضای بی‌طرف، شعاع دیداری/تعامل جدا و tie-break قطعی |
| `src/services/game/wheelInteraction.ts` | ماشین حالت فقط نقطه فعلی را می‌خواند و `previousPoint` ندارد | جهش A→D می‌تواند B/C را جا بیندازد؛ شروع از فضای خالی پس از حرکت هم انتخاب را تصاحب می‌کند | sweep پیوسته، interpolation از segment، backtrack قطعی، «شروع فقط از tile»، وضعیت لغو و چندلمسی روشن، آستانه ورود/خروج برای hysteresis |
| `src/hooks/useWheelGestures.ts` | هر event روی JS پردازش می‌شود؛ خط با `useSyncExternalStore` در React/SVG دوباره رسم می‌شود؛ Pan سطح خالی را هم می‌گیرد | Reanimated/Worklets نصب نیست؛ pointer به‌جای shared value، store خارجی و subscribe است؛ `minDistance` به‌تنهایی منبع آغاز را اعتبارسنجی نمی‌کند | Gesture Handler + Reanimated 4/Worklets؛ tracker/path و segment sweep روی UI thread؛ فقط تغییر واقعی انتخاب و پایان ژست با `runOnJS` به بازی برسد؛ لغو lifecycle و چندلمسی صریح |
| `src/components/game/LetterWheel.tsx`, `LetterTile.tsx` | خط متحرک SVG روی JS به‌روزرسانی می‌شود و tileها ظاهر کارتونی/قدیمی دارند | path به React external-store وصل است و tile component memo/انیمیشن انتخاب ندارد | path با animated props، backdrop ثابت، tileهای memoشده و حالت‌های pressed/selected/disabled/hint، با تم تیره و عمق کنترل‌شده |
| `src/screens/GameScreen.tsx`, `GameHeader.tsx`, `WordSlots.tsx`, `FoundWordsList.tsx` | صفحه شلوغ و روشن؛ لیست کلمات فضای اصلی می‌گیرد؛ دکمه‌ها سه CTA هم‌وزن‌اند | سلسله‌مراتب بازی و کلمه جاری ضعیف است و فهرست پاسخ‌ها داخل محدوده بازی اسکرول می‌شود | layout بازی جدید با header جمع‌وجور، Word Board واقعی، progress/discovery فشرده، wheel محور، کنترل‌های آیکونی و Submit اصلی؛ حفظ reducer/engine/hints/rewards |
| `src/screens/ResultScreen.tsx`, `HomeScreen.tsx`, `GameScreen.tsx`, `ProgressContext.tsx`, `preview-v2/app.js` | پس از آخرین واژه پیام تبریک مسیر بعدی را باز نمی‌کرد و مرحله آخر پیام اختصاصی پایان نداشت | `GameScreen` مقصد بعدی را محاسبه می‌کرد اما فقط با دکمهٔ دستی استفاده می‌شد؛ نتیجهٔ روزانه نیز route جدا دارد و نباید وارد progression معمولی شود | timer قابل لغو برای مرحله بعد؛ مقصد `null` برای پیام پایان و خانه؛ daily از timer مستثنا؛ استفاده از پیشرفت/پاداش موجود و دادهٔ واقعی مراحل در Preview |
| `src/components/ui/FeedbackBanner.tsx`, `GameContext.tsx`, `GameScreen.tsx` | پیام خطا در یک خط بریده می‌شود و آیکون ضربدر توجه را می‌رباید؛ خطای مشخص ممکن است برای کاربر فقط «×» به‌نظر برسد | Banner عمومی با متن یک‌خطی و آیکون `close` در جایگاه محدود؛ علت rejection در Context ثبت می‌شود ولی presentation آن را کم‌رنگ/بریده می‌کند | پیام شناور مستقل از layout با علت فارسی مشخص، واژه ردشده، نشان رنگی/آیکون، micro-animation و زمان کوتاه؛ نگه‌داشتن نگاشت reason→متن و بدون جابه‌جایی چرخ |
| `src/screens/HomeScreen.tsx` | بنر روبانی/حروف شناور بر محور تصویرسازی قدیمی است؛ «ادامه بازی» بین چند کارت گم می‌شود | hero و بازی روزانه سلسله‌مراتب کافی ندارند | Hero تیره و مینیمال، CTA «ادامه بازی» برجسته، پیشرفت/مرحله/امتیاز روشن، کارت مستقل Daily و streak، تنظیمات در دسترس |
| `src/screens/LevelMapScreen.tsx`, `LevelNode.tsx`, `levelTitles.ts` | گروه‌بندی ده‌تایی هست، اما به chapter/نقشه پیشرفت قابل‌فهم تبدیل نشده | `worldLabel` صرفاً بازه عددی را نشان می‌دهد | پنج فصل نمایشی ده‌مرحله‌ای با نام‌های روایی و مسیر nodeهای متصل؛ statusهای داده فعلی حفظ می‌شوند |
| `src/screens/SettingsScreen.tsx` و UI مشترک | تنظیمات قابل استفاده است اما از هویت دیداری تازه پیروی نمی‌کند | رنگ‌ها/کارت‌ها از Theme روشن قبلی می‌آیند | مهاجرت توکن‌ها و سطوح مشترک؛ حفظ رفتار ذخیره‌سازی، toggleها و مسیرهای فعلی |
| `src/theme/*`, `ScreenContainer.tsx`, `App.tsx`, `RootNavigator.tsx`, Android `colors.xml/styles.xml` | پالت آسمانی/روشن و StatusBar تیره با جهت نسخه جدید ناهم‌خوان است | Design tokens فعلی تم قدیمی را به همه صفحات پخش می‌کنند | توکن‌های Deep Navy/Indigo + Purple/Teal/Gold، سطوح نرم و glow کم‌هزینه؛ status/navigation bar روشن روی زمینه تیره |
| `preview/` | پیش‌نمایش قدیمی با طراحی قبلی موجود است | preview موجود مستقل از UI و لمس نسخه جدید است | حفظ کامل `preview/` و افزودن `preview-v2/` مستقل، responsive و تعاملی با Pointer Events و همان swept hit test |
| `package.json`, `babel.config.js`, `android/app/build.gradle`, `APP_INFO` | نسخه 1.0.0؛ Reanimated/Worklets وجود ندارد | بدون dependency و Babel plugin، animation/path روی thread رابط اجرا نمی‌شود | نسخه 2.0.0 و versionCode بالاتر؛ افزودن Reanimated 4 و Worklets سازگار با RN 0.87/New Architecture؛ plugin Worklets در آخرین position |
| `GameContext`, engine, dictionary, level data, storage/providers | اساس معماری سالم و دارای تست است | مسئله اصلی presentation/gesture است، نه موتور یا داده | حفظ؛ فقط در صورت نیاز مرز ارتباط ژست→selection بازبینی شود؛ اقتصاد و داده بازنویسی نشوند |

## تأیید سازگاری Reanimated

اطلاعات registry در زمان ممیزی نشان می‌دهد `react-native-reanimated@4.7.1` peerهای `react-native@0.86–0.88` و `react-native-worklets@0.13.x` را می‌پذیرد. این پروژه روی RN `0.87.1` و New Architecture است؛ بنابراین این جفت نسخه در بازه سازگاری اعلام‌شده قرار می‌گیرد. Babel باید `react-native-worklets/plugin` را پس از سایر pluginها داشته باشد. این تأیید dependency compatibility است، نه ادعای Native build موفق؛ محیط حاضر در زمان ممیزی Java و `ANDROID_HOME` ندارد.

## معماری هدف

```text
GameScreen (renderer / game UI)
  └─ GameSurface / LetterWheel
       ├─ Gesture Layer (single-pointer Pan, tile-gated activation)
       ├─ UI-thread PointerTracker + shared selection path
       ├─ Continuous Segment Hit Test (previousPoint → currentPoint)
       ├─ Selection Machine (hysteresis, ordered crossings, backtrack/cancel)
       └─ JS bridge فقط برای تغییر انتخاب واقعی / submit یک‌باره
             └─ GameContext → Game Engine → validator / score / rewards
```

تفکیک وضعیت:
- **Gesture/UI thread:** pointer، previous point، active tile، phase، draft path؛ Reanimated shared values.
- **Game:** شناسه‌های selection، found words، score/combo/feedback؛ GameContext موجود.
- **Persistent:** coins/hearts/progress/settings؛ Provider و repositories موجود.

## برنامه مهاجرت

1. ثبت ممیزی؛ قفل‌کردن دامنه: داده‌ها، موتور و providerها حفظ شوند.
2. افزودن Reanimated/Worklets و پیکربندی Babel؛ سپس تست pure segment geometry و machine state (بدون وابستگی به render).
3. انتقال pointer/path و sweep به worklet/UI thread؛ bridge فقط روی تغییر واقعی انتخاب؛ tap و لغوها حفظ شوند.
4. بازطراحی wheel/tile/word board/feedback و Game Screen با توکن‌های جدید، بدون تغییر قواعد بازی.
5. بازطراحی Home، نقشه فصل‌ها و Settings؛ حفظ روت‌ها و منطق فعلی.
6. ایجاد `preview-v2/` با همان هندسه/تعامل، حالت‌های Home/Game/Map/Settings و تست browserless برای slow/fast/diagonal/backtrack/outside.
7. ارتقای نسخه، اجرای typecheck/lint/unit+integration/data validation و بررسی buildهای Android در صورت وجود JDK/SDK؛ محدودیت‌های تأییدنشده صریح گزارش شوند.

## معیارهای راستی‌آزمایی

- هندسه: پرش A→D باید تمام tileهای میان مسیر را به ترتیب projection `t` برگرداند؛ عبور کنار tile خارج interaction radius آن را انتخاب نکند.
- ماشین حالت: tap، fast/slow/diagonal sweep، backtrack، duplicate IDs، فضای خالی، multi-touch/cancel، AppState و پایان ژست.
- کارایی: ۱۰۰۰ pointer sample بدون ۱۰۰۰ GameContext/React selection update؛ مسیر pointer در UI thread؛ tileها در حرکت داخل همان کاشی بی‌دلیل render نشوند.
- UI: RTL، صفحه باریک/بلند و تبلت، متن rejection قابل‌خواندن، preview قابل تعامل.
- Release: package id حفظ شود؛ Android versionName/code و APP_INFO همسان شوند؛ build فقط در محیط دارای JDK/Android SDK به‌عنوان موفق اعلام شود.

## نتیجه و وضعیت اجرای نسخهٔ ۲.۰.۰

### رفتار قبل و بعد

| پیش از نسخهٔ ۲ | پس از تغییر |
|---|---|
| لمس چرخ تنها آخرین نقطه را hit می‌کرد؛ حرکت سریع ممکن بود tileهای بین دو نمونه را جا بیندازد | segment متناهی با projection مرتب‌شده بر اساس `t` sweep می‌شود؛ fast/slow/diagonal hit، dead zone و hysteresis آزمون دارند |
| pointer/path در store سمت JS و rerenderهای مکرر بود | pointer، state ماشین و مسیر متحرک در shared values/worklet؛ انتخاب فقط با تغییر واقعی به JS پل می‌زند |
| Home/Game/Map/Settings با تم روشن و سلسله‌مراتب قدیمی | Dark Premium responsive/RTL با برد واژه، پیشرفت، feedback علت‌محور، فصل‌ها و تنظیمات هم‌هویت |
| پس از تکمیل، انتقال خودکار نبود و برای ادامه باید «مرحلهٔ بعد» را دستی زد؛ پایان بازی پیام اختصاصی نداشت | Native نتیجهٔ تبریک‌دار را ۵ ثانیه نشان می‌دهد و خودکار مرحلهٔ بعد را باز می‌کند؛ مرحلهٔ آخر پیام اتمام بازی می‌دهد و به خانه برمی‌گردد؛ پاداش و ذخیرهٔ پیشرفت حفظ می‌شوند. Preview v2 همین مسیر را با مکث ۲٫۵ ثانیه اجرا می‌کند؛ چالش روزانه از هر دو انتقال خودکار مستثناست و پیشرفت عادی را تغییر نمی‌دهد |
| Preview قدیمی نمایندهٔ تعامل جدید نبود | `preview-v2/` مستقل با Pointer Events، سناریوهای لمس و helper هندسهٔ مشترک؛ `preview/` حفظ شد |
| اسناد انتشار روی 1.0.0 مانده بودند | package، APP_INFO، Android versionName، versionCode، README، changelog، release docs و workflow همسان شدند |

### اعتبارسنجی انجام‌شده

- `npm run verify` — موفق: typecheck، lint و Jest؛ ۲۳ test suite و ۳۰۴ تست سبز. ESLint صفر خطا و ۱۷ هشدار قبلی/موجود دارد.
- `__tests__/integration/levelCompletion.test.tsx` سه مسیر را با رابط و storage واقعی اپ می‌سنجد: مرحلهٔ ۱→۲ خودکار، مرحلهٔ ۵۰→خانه همراه پیام پایان، و چالش روزانه بدون انتقال خودکار یا ثبت پیشرفت مرحله‌ای.
- `npm run levels:check` — موفق: ۵۰ مرحله، ۶۰ پازل روزانه، ۷۳۵ جواب؛ توزیع difficulty برابر ۱۵/۱۵/۱۰/۱۰.
- `git diff --check` — بدون خطای whitespace پس از اصلاح.
- `preview-v2/` با `tools/serve-preview-v2.py` روی پورت ۴۱۷۳ سرو می‌شود؛ ریشهٔ live preview به v2 هدایت می‌شود و preview قدیمی همچنان در `/preview/` می‌ماند؛ HTTP smoke test صفحه، helperها و فونت محلی `200 OK` گرفت. سپس QA در Chromium headless انجام شد: tap و drag واقعی Pointer Events واژهٔ «ابر» را ثبت کرد؛ سناریوهای sweep/backtrack/dead zone/cancel/duplicate، پنج فصل نقشه و toggle تنظیمات کار کردند؛ عرض‌های ۳۲۰، ۳۶۰، ۳۹۰، ۷۶۰، ۱۰۲۴ و ۱۴۴۰ overflow افقی نداشتند و هیچ خطای JS ثبت نشد. پس از اصلاح: مرکز bounding box حلقهٔ سبز در ۱۲۸۰×۹۰۰ با مرکز wheel دقیقاً منطبق شد؛ راهنمای واقعی از ۱۲۰ به ۱۰۵ سکه رسید، دنبالهٔ حرف بعدی «ا ← ب ← ر» را روشن کرد، واژهٔ آماده را بدون خرج اضافه تشخیص داد و ثبت «ابر» را به ۱/۴ رساند. پروفایل قدیمیِ صفرسکه‌ای هم یک‌بار تا ۱۵ سکه مهاجرت کرد؛ تلاش راهنمای بعدی با سکه صفر، بدون کسر سکه پیام کافی‌نبودن را نشان داد. همهٔ عرض‌های ۳۲۰ تا ۱۴۴۰ پس از hint بدون overflow و خطای JS بودند. QA همین نوبت در Chromium headless با لمس دکمه‌ای روی ۱۱۸۰×۸۵۰ مرحلهٔ ۱ را کامل کرد و شروع خودکار مرحلهٔ ۲ و ذخیرهٔ پیشرفت را دید؛ با seed مرحلهٔ ۴۹، تکمیل مرحلهٔ ۵۰ پیام پایان و بازگشت خانه را نشان داد. چالش روزانه نیز به خانه برگشت و `completed` مرحله‌های عادی را روی ۰ نگه داشت؛ هیچ خطای مرورگر ثبت نشد. بررسی نشان داد bottom navigation در ارتفاع کوتاه روی Submit می‌افتد؛ اکنون navigation هنگام Game در همهٔ عرض‌ها پنهان است و بازی دکمهٔ بازگشت بالای صفحه دارد.
- React Native: `__tests__/integration/hints.test.tsx` مسیر لمس دکمهٔ راهنما → نمایش برگه → خرید → کسر ۱۵ سکه → نمایش HintGuide را با ۳۰ سکه آغازین آزمود؛ `__tests__/unit/letterWheelGesture.test.tsx` مرکز و offset قوس سبز را نسبت به مرکز geometry تأیید کرد. این QA در Jest/RNTL است و جایگزین اجرای روی دستگاه Android نیست.
- `npm run android:preflight` و تلاش واقعی `npm run android:apk:release` — متوقف/ناموفق به‌دلیل نبود JDK/`java` و مسیر Android SDK. هیچ APK/AAB ساخته نشده است.
- `npm audit --omit=dev` — ۲۲ مورد آسیب‌پذیری high و صفر critical در dependency graph گزارش شد؛ dry-run چند downgrade ناسازگار، ازجمله React Native `0.87.1` به `0.72.17` پیشنهاد می‌کند، بنابراین هیچ `audit fix --force` اعمال نشد. نیازمند بازبینی سازگاری پیش از انتشار است.

### فایل‌های اصلی

- ورودی/پیکربندی: `App.tsx`, `package.json`, `package-lock.json`, `babel.config.js`, `jest.config.js`, `jest.setup.ts`.
- gesture/engine boundary: `src/services/game/wheelGeometry.shared.js`, `wheelGeometry.shared.d.ts`, `wheelInteraction.shared.js`, `wheelInteraction.shared.d.ts`, `wheelGesture.ts`, `wheelInteraction.ts`, `src/hooks/useWheelGestures.ts`, `src/components/game/LetterWheel.tsx`.
- UI/theme/screens: `src/theme/`, `src/components/game/`, `src/components/ui/`, `src/screens/`, `src/context/GameContext.tsx`, `src/navigation/RootNavigator.tsx`.
- آزمون‌ها: `__tests__/unit/wheelGesture.test.ts`, `wheelInteraction.test.ts`, `wheelPerformance.test.ts`, `ui.test.tsx`, `__tests__/integration/levelCompletion.test.tsx` و setup مربوطه.
- preview و اسناد انتشار: `preview-v2/`, `tools/serve-preview-v2.py`, `README.md`, `CHANGELOG.md`, `docs/BAZAAR_RELEASE_CHECKLIST.md`, `docs/BUILD_AND_RUN.md`, `docs/INSTALL_TROUBLESHOOTING.md`, `docs/ci/android-apk.yml`, `tools/verify-apk.sh`.
- Android package ID و دادهٔ مرحله‌ها/دیکشنری حفظ شده‌اند؛ نسخه اکنون `2.0.0` و `versionCode 20000` است.
