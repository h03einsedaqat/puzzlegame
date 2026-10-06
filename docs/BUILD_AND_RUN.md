# راهنمای ساخت و نصب روی گوشی

این سند سه مسیر دارد:

1. **ساخت روی رایانه خودت** — کامل‌ترین راه؛ برای انتشار نهایی هم همین لازم است.
2. **ساخت ابری روی گیت‌هاب** — اگر JDK و Android SDK روی رایانه‌ات نیست.
3. **نصب روی گوشی** — با کابل یا بدون کابل، و کارهای بعدش.

خلاصه سریع برای کسی که همه پیش‌نیازها را دارد:

```bash
npm install
npm run android:preflight      # بررسی محیط: Node، JDK، SDK و بسته‌های لازم
npm run android:apk:release    # بسته مستقل و قابل نصب روی گوشی
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## ۱) پیش‌نیازهای یک‌بار برای همیشه

### Node.js

نسخه ۲۲.۱۳ یا بالاتر لازم است (فایل `.nvmrc` هم همین را می‌گوید).

```bash
node -v      # باید 22.13.0 یا بالاتر باشد
```

### JDK

React Native 0.87 با **JDK 17 یا 21** کار می‌کند (Gradle 9 کمترینش JDK 17 است، پس
JDK 8 و 11 کار نمی‌کنند). اگر Java نداری:

- ویندوز/مک: [Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17)
- اوبونتو/دبیان: `sudo apt install openjdk-17-jdk`
- **یا** Android Studio را نصب کن؛ JDK داخل خودش هست و `npm run android:preflight`
  همان را پیدا می‌کند و مسیرش را نشانت می‌دهد. (پوشه‌اش کنار Android Studio و به نام
  `jbr` است.)

```bash
java -version     # باید 17.x یا 21.x باشد
echo $JAVA_HOME   # ویندوز: echo %JAVA_HOME%
```

گریدل نسخه جاوا را از `JAVA_HOME` برمی‌دارد، نه از `java` روی PATH؛ پس اگر
`npm run android:preflight` گفت «JAVA_HOME تنظیم نشده»، این کار را بکن:

```bash
# ویندوز (PowerShell یا CMD) — بعد پنجره ترمینال را ببند و باز کن
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.13"

# مک
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# لینوکس
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64     # مسیر را با نسخه خودت هماهنگ کن
```

در مک و لینوکس همان خط `export` را در `~/.zshrc` یا `~/.bashrc` هم بگذار تا برای
همیشه بماند.

### Android SDK

ساده‌ترین راه، نصب [Android Studio](https://developer.android.com/studio) است؛
هنگام نصب «Android SDK» و «Android SDK Platform-Tools» را انتخاب کن. سپس در
Android Studio → Settings → Languages & Frameworks → Android SDK:

- **SDK Platforms**: تب «Show Package Details» را بزن و `Android SDK Platform 37`
  را نصب کن.
- **SDK Tools**: `Android SDK Build-Tools 37` و `NDK (Side by side) 27.1.12297006`
  را نصب کن.

آدرس SDK را در فایل `android/local.properties` بگذار (این فایل در git نمی‌رود):

```properties
# ویندوز
sdk.dir=C\:\\Users\\<نام کاربری>\\AppData\\Local\\Android\\Sdk

# مک
sdk.dir=/Users/<نام کاربری>/Library/Android/sdk

# لینوکس
sdk.dir=/home/<نام کاربری>/Android/Sdk
```

جای اصلی SDK اگر همان مسیر پیش‌فرض باشد (ویندوز:
`%LOCALAPPDATA%\Android\Sdk` ، مک: `~/Library/Android/sdk` ، لینوکس:
`~/Android/Sdk`)، لازم نیست دستی فایل بسازی؛ دستور `npm run android:preflight -- --fix`
خودش `android/local.properties` را می‌سازد. متغیر محیطی `ANDROID_HOME` هم اگر به همین
مسیر اشاره کند، همان کافی است.

### بررسی یک‌جای همه‌چیز

```bash
npm run android:preflight            # بررسی Node، JDK، SDK و بسته‌های لازم
npm run android:preflight -- --fix   # علاوه بر بررسی، android/local.properties را هم بساز
```

این ابزار نسخه Node، نسخه JDK، مسیر SDK و بسته‌های دقیق SDK را از روی خودِ فایل‌های
پروژه بررسی می‌کند و اگر چیزی کم باشد، دستور دقیق نصبش را چاپ می‌کند. JDK را در
جای‌های معمول نصب (از جمله JDK همراه Android Studio) هم می‌گردد و اگر SDK را در مسیر
پیش‌فرض پیدا کند ولی `android/local.properties` ساخته نشده باشد، دستور ساختش را
نشانت می‌دهد.

---

## ۲) ساخت روی رایانه خودت

```bash
npm install
npm run fonts:link       # کپی فونت وزیرمتن به دارایی‌های اندروید
npm run android:apk:release
```

خروجی: `android/app/build/outputs/apk/release/app-release.apk`

این بسته **مستقل** است: کد جاوااسکریپت، صداها و فونت‌های فارسی داخلش هستند و برای
اجرا به Metro یا اینترنت نیاز ندارد.

> اگر `android/keystore.properties` را نساخته باشی، بسته با کلید debug امضا می‌شود.
> این برای نصب و تست روی گوشی خودت کاملاً کار می‌کند، ولی **برای کافه‌بازار باید با
> کلید خودت امضا شود** (بخش ۵ همین سند).

برای ساخت بسته فروشگاه (AAB) و بسته‌های جدا برای هر معماری:

```bash
npm run android:aab:release
npm run android:apk:splits
```

---

## ۳) ساخت ابری روی گیت‌هاب (بدون نصب JDK و Android SDK)

اگر روی رایانه‌ات جاوا و SDK نداری، گیت‌هاب بسته را برایت می‌سازد و در صفحه Releases
می‌گذارد. فایل آماده گردش‌کار در `docs/ci/android-apk.yml` است. گیت‌هاب برای افزودن فایل
زیر `.github/workflows/` دسترسی ویژه می‌خواهد (توکن ربات‌های CI اجازه‌اش را ندارند)، پس
این یک قدم را خودت انجام بده؛ دو راه دارد:

**راه سریع (فقط یک Commit):** نشانی صفحه «ساخت فایل تازه» را باز کن و محتوا را در
پارامتر `value` بگذار — ویرایشگر خودش نام و محتوا را پر می‌کند و فقط «Commit changes»
می‌مانَد:

```text
https://github.com/<کاربر>/<مخزن>/new/main/.github/workflows
    ?filename=android-apk.yml
    &value=<محتوای percent-encoded فایل docs/ci/android-apk.yml>
```

برای ساختن همین آدرس به‌صورت خودکار (بدون کپی‌دستی متن فایل)، این یک‌خطی کافی است:

```bash
python3 -c "import urllib.parse as u;print('https://github.com/<کاربر>/<مخزن>/new/main/.github/workflows?filename=android-apk.yml&value='+u.quote(open('docs/ci/android-apk.yml',encoding='utf-8').read(),safe=''))"
```

**راه دستی:** فایل `.github/workflows/android-apk.yml` را بساز و محتوای
`docs/ci/android-apk.yml` را در آن بچسبان.

همین کار برای گردش‌کار بازبینی هم لازم است (یک‌بار؛ اختیاری ولی توصیه‌شده). با همان
روش، فقط نام فایل و منبع را عوض کن:

```bash
python3 -c "import urllib.parse as u;print('https://github.com/<کاربر>/<مخزن>/new/main/.github/workflows?filename=apk-verify.yml&value='+u.quote(open('docs/ci/apk-verify.yml',encoding='utf-8').read(),safe=''))"
```

**نکته:** اگر `.github/workflows/android-apk.yml` را قبلاً ساخته‌ای، محتوایش را با
نسخه تازه `docs/ci/android-apk.yml` عوض کن. نسخه تازه بسته را **پیش از انتشار** با
`zipalign`/`apksigner`/`aapt2` بررسی می‌کند (اگر سالم نباشد چیزی روی صفحه Releases عوض
نمی‌شود)، فایل `.sha256` و حجم/هش را منتشر می‌کند و صفحه Releases را حذف و از نو
نمی‌سازد تا لینک دانلود هیچ‌وقت خالی نماند.

با همین Commit روی `main`، ساخت خودکار شروع می‌شود. از این پس:

- **اجرای دستی (بدون هیچ push):** تب **Actions** → گردش‌کار «Android APK» →
  دکمه **Run workflow** → شاخه دلخواه را انتخاب کن → Run workflow.
- **خودکار:** هر push روی `main` (و روی شاخه‌هایی که خودشان نسخه‌ای از این فایل را
  دارند) بسته را می‌سازد.

خروجی‌ها:

- **صفحه Releases** با برچسب `apk-latest` و فایل `kalamesaz-1.0.0-arm.apk`؛ لینک
  همیشه‌ثابت دانلود:

  `https://github.com/<کاربر>/<مخزن>/releases/download/apk-latest/kalamesaz-1.0.0-arm.apk`

  (این لینک با هر ساخت تازه روی همان نام به‌روز می‌شود.) روی همین صفحه، **حجم دقیق** و
  **SHA-256** بسته نوشته می‌شود و فایل `kalamesaz-1.0.0-arm.apk.sha256` هم گذاشته
  می‌شود؛ با آن می‌توانی بفهمی دانلودت کامل شده یا نه (بخش ۴ و
  `docs/INSTALL_TROUBLESHOOTING.md`).

- گردش‌کار اختیاری **«Verify published APK»** (`docs/ci/apk-verify.yml`): همان فایلی را
  که کاربر دانلود می‌کند از صفحه Releases می‌گیرد و با ابزارهای رسمی اندروید بررسی
  می‌کند و گزارش را در `docs/ci-reports/` می‌گذارد. یک‌بار که آن را هم مثل گردش‌کار
  ساخت افزودی، از این پس با هر تغییر در گردش‌کارها/اسناد یا با زدن دکمه **Run
  workflow** اجرا می‌شود.

- **آرتیفکت** `kalamesaz-apk` در صفحه اجرا (۳۰ روز می‌ماند):

  ```bash
  gh run download --name kalamesaz-apk
  ```

هر دو خروجی همان `app-release.apk` است؛ فایل `kalamesaz-1.0.0-arm.apk` فقط نام
خوش‌دست‌تر همان بسته برای دانلود است.

> بسته‌ای که گیت‌هاب می‌سازد با کلید debug امضا شده و برای کافه‌بازار مناسب نیست؛
> برای انتشار باید روی رایانه خودت و با کلید خودت بسازی (بخش ۵).

---

## ۴) نصب و اجرا روی گوشی

پیش از فرستادن بسته به گوشی، یک‌بار سلامت خودِ فایل را بسنج (سالم بودن zip، امضای
v1/v2/v3، ترازبندی و مانیفست) تا اگر مشکلی هست همان‌جا معلوم شود، نه روی گوشی:

```bash
bash tools/verify-apk.sh android/app/build/outputs/apk/release/app-release.apk
# یا: npm run apk:verify -- android/app/build/outputs/apk/release/app-release.apk
```

اگر گوشی هنگام نصب گفت «App not installed as package appears to be invalid»، راهنمای
کامل در [`INSTALL_TROUBLESHOOTING.md`](INSTALL_TROUBLESHOOTING.md) است (سنجش حجم و
SHA-256 برای تشخیص دانلود ناقص، مشکل امضا، نسخه اندروید و Play Protect).

### الف) با کابل USB

```bash
adb devices                                  # گوشی باید در فهرست باشد
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

اگر `adb` شناخته نشد، از مسیر کامل استفاده کن:
`~/Android/Sdk/platform-tools/adb` (لینوکس) یا
`%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` (ویندوز).

`-r` یعنی نصب روی نسخه قبلی بدون پاک‌کردن پیشرفت بازی.

گوشی باید «USB Debugging» روشن داشته باشد: Settings → About phone → هفت بار روی
Build number بزن → Developer options → USB debugging.

### ب) بدون کابل

فایل `app-release.apk` را با کابل، بلوتوث، تلگرام یا فضای ابری به گوشی بفرست،
روی گوشی لمس کن و اگر پیام آمد، برای همان برنامه (مثلاً فایل‌منیجر) اجازه
«نصب برنامه از منابع نامعلوم» را بده.

### ج) حالت توسعه با Metro (فقط برای برنامه‌نویسی)

نسخه debug بسته را با Metro اجرا می‌کند، پس برای نصب روی گوشی این مسیر را فقط اگر
می‌خواهی کد را زنده تغییر بدهی استفاده کن:

```bash
npx react-native run-android        # ساخت، نصب و اجرا با Metro
# یا جدا:
npm start                           # ترمینال اول
npm run android:bundle:debug        # بسته debug (شناسه ir.kalamesaz.game.debug)
adb reverse tcp:8081 tcp:8081       # تا گوشی به Metro روی رایانه وصل شود
```

> بسته debug بدون `adb reverse` و بدون Metro صفحه سرخ «Unable to load script» نشان
> می‌دهد؛ برای نصب روی گوشی دوستان و خانواده، همیشه از بسته **release** استفاده کن.

### د) اولین اجرا

1. صفحه خوش‌آمد و سه صفحه معرفی کوتاه می‌آید.
2. «شروع بازی» را بزن؛ مرحله ۱ خودش نقش آموزش را دارد.
3. حروف را با لمس انتخاب کن، با دکمه ثبت کلمه را بفرست.
4. بعد از چند ثانیه، برنامه را کامل ببند و دوباره باز کن: پیشرفت باید سر جایش باشد.

---

## ۵) نسخه انتشار: امضاشده برای کافه‌بازار

### الف) ساخت کلید امضا (فقط یک‌بار در عمر برنامه)

```bash
cd android
keytool -genkeypair -v -storetype PKCS12 \
  -keystore kalamesaz-release.jks \
  -alias kalamesaz \
  -keyalg RSA -keysize 2048 -validity 10000
```

- رمزها را جایی امن نگه دار؛ **گم‌شدن کلید یعنی از دست دادن امکان به‌روزرسانی برنامه**.
- فایل `.jks` هرگز نباید وارد git شود (در `.gitignore` مسدود شده است).

### ب) پیکربندی امضا

```bash
cd android
cp keystore.properties.example keystore.properties
```

و مقادیر را پر کن:

```properties
storeFile=../keys/kalamesaz-release.jks
storePassword=<رمز فروشگاه کلید>
keyAlias=kalamesaz
keyPassword=<رمز کلید>
```

مسیر `storeFile` نسبت به پوشه `android/app` خوانده می‌شود؛ اگر فایل کلید را جای
دیگری گذاشتی، همین مسیر را اصلاح کن. بعد از این، `npm run android:preflight` باید
بنویسد «امضای انتشار: با کلید خودت».

### ج) ساخت خروجی

```bash
npm run android:apk:release    # APK
npm run android:aab:release    # AAB (مسیر پیشنهادی کافه‌بازار)
```

خروجی‌ها:

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

> در `android/app/build.gradle` روی هر دو پیکربندی امضا مقدار `enableV1Signing true`
> گذاشته شده است. این خط را حذف نکن: AGP وقتی `minSdkVersion` بزرگ‌تر یا مساوی ۲۴
> باشد امضای v1 (JAR) را خودش خاموش می‌کند و بعضی نصب‌کننده‌های گوشی، بسته‌ای که فقط
> امضای v2 دارد را با پیام «App not installed as package appears to be invalid» رد
> می‌کنند. برای اطمینان، بعد از ساخت بگو `bash tools/verify-apk.sh <apk>` باید بنویسد
> «امضای v1 (JAR) هم سالم است».

### د) نصب نسخه انتشار روی گوشی خودت

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

اگر خطای «امضای متفاوت» گرفتی (چون نسخه debug یا نسخه امضاشده قبلی نصب بوده):

```bash
adb uninstall ir.kalamesaz.game
adb uninstall ir.kalamesaz.game.debug
```

---

## ۶) اگر روی گوشی درست بالا نیامد

| نشانه                                                    | علت احتمالی                     | راه‌حل                                                                              |
| -------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| صفحه سفید یا «Unable to load script»                     | بسته debug بدون Metro نصب شده   | بسته release بساز و همان را نصب کن                                                  |
| متن‌ها پیش‌فرض اندروید هستند، نه وزیرمتن                 | فونت‌ها در بسته نیستند          | `npm run fonts:link` و بعد ساخت دوباره بسته                                         |
| `SDK location not found`                                 | `android/local.properties` نیست | `npm run android:preflight -- --fix` یا مسیر SDK را در آن فایل بنویس                |
| «JDK پیدا نشد» در preflight                              | جاوا نصب نیست                   | Android Studio را نصب کن (JDK داخلش هست) یا Temurin 17؛ بعد `JAVA_HOME` را تنظیم کن |
| «JAVA_HOME تنظیم است ولی پوشه‌اش java ندارد»             | مسیر `JAVA_HOME` اشتباه است     | مسیر درست، پوشه `jbr` کنار Android Studio یا پوشه `jdk-17` نصب‌شده است              |
| `Unsupported class file major version`                   | JDK خیلی جدید                   | JDK 17 یا 21 نصب کن و `JAVA_HOME` را عوض کن                                         |
| `NDK not found` روی یونیتی/ویندوز                        | NDK نصب نشده                    | در SDK Manager نسخه `27.1.12297006` را نصب کن                                       |
| گریدل هنگام ساخت دارایی‌ها را دانلود نمی‌کند             | بی‌اینترنتی/فیلترینگ            | یک بار با اینترنت پایدار بساز؛ بعد از آن در `~/.gradle` کش می‌شود                   |
| برنامه فوراً بسته می‌شود                                 | داده خراب از نسخه قبلی          | برنامه را حذف و دوباره نصب کن (یا در برنامه «پاک‌کردن پیشرفت» را بزن)               |
| ساخت روی ویندوز: «The filename or extension is too long» | مسیر پروژه خیلی عمیق است        | پروژه را در مسیری کوتاه مثل `C:\dev\kalamesaz` بگذار                                |
| «INSTALL_FAILED_UPDATE_INCOMPATIBLE»                     | امضای بسته با نصب قبلی یکی نیست | نسخه قبلی را حذف کن (`adb uninstall ir.kalamesaz.game`)                             |

نمونه کارهایی که روی گوشی باید ببینی: لمس حروف، نوار پیشرفت واژه‌های هدف، صفحه
نتیجه با ستاره و سکه، باز شدن «قلب» بعد از تمام‌شدن، و شمارش معکوس قلب بعدی.

برای دیدن لاگ‌های گوشی:

```bash
npx react-native log-android
# یا
adb logcat *:S ReactNative:V ReactNativeJS:V
```

---

## ۷) پیش از انتشار

فهرست کامل کارها در `docs/BAZAAR_RELEASE_CHECKLIST.md` است. خلاصه حداقلی:

```bash
npm run verify          # typecheck + lint + test
npm run levels:check    # اعتبارسنجی مرحله‌ها و پازل‌های روزانه
npm run android:preflight
```

اسکرین‌شات‌ها و متن فروشگاه هم آماده‌اند: `docs/SCREENSHOT_PLAN.md` و
`docs/STORE_LISTING.md`.
