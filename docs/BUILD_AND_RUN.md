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

React Native 0.87 با **JDK 17 یا 21** کار می‌کند. اگر Java نداری:

- ویندوز/مک: [Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17)
- اوبونتو/دبیان: `sudo apt install openjdk-17-jdk`

```bash
java -version     # باید 17.x یا 21.x باشد
echo $JAVA_HOME   # ویندوز: echo %JAVA_HOME%
```

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

متغیر محیطی `ANDROID_HOME` هم باید به همین مسیر اشاره کند.

### بررسی یک‌جای همه‌چیز

```bash
npm run android:preflight
```

این ابزار نسخه Node، نسخه JDK، مسیر SDK و بسته‌های دقیق SDK را از روی خودِ فایل‌های
پروژه بررسی می‌کند و اگر چیزی کم باشد، دستور دقیق نصبش را چاپ می‌کند.

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

اگر روی رایانه‌ات جاوا و SDK نداری، گیت‌هاب بسته را برایت می‌سازد. فایل آماده گردش‌کار
در `docs/ci/android-apk.yml` است؛ فقط یک‌بار آن را در مخزن سر جایش بگذار. گیت‌هاب برای
افزودن فایل زیر `.github/workflows/` دسترسی ویژه می‌خواهد، پس این یک قدم را خودت انجام
بده (سه کلیک):

1. این نشانی را باز کن؛ ویرایشگر با نام فایل از پیش پر شده باز می‌شود:

   `https://github.com/<کاربر>/<مخزن>/new/main?filename=.github/workflows/android-apk.yml`

2. محتوای `docs/ci/android-apk.yml` را از صفحه مخزن کپی کن و در ویرایشگر بچسبان.
3. پایین صفحه «Commit changes» را بزن (روی شاخه `main`).

از این پس دو راه برای ساختن بسته داری:

- **اجرای دستی (بدون هیچ push):** تب **Actions** → گردش‌کار «Android APK» →
  دکمه **Run workflow** → شاخه دلخواه را انتخاب کن → Run workflow.
- **خودکار:** هر push روی `main` (و روی شاخه‌هایی که خودشان نسخه‌ای از این فایل را
  دارند) بسته را می‌سازد.

نتیجه در همان صفحه اجرا، بخش **Artifacts** با نام `kalamesaz-apk` است؛ یا با دستور:

```bash
gh run download --name kalamesaz-apk
```

داخل فایل zip، `app-release.apk` است؛ همان را روی گوشی نصب کن.

> بسته‌ای که گیت‌هاب می‌سازد با کلید debug امضا شده و برای کافه‌بازار مناسب نیست؛
> برای انتشار باید روی رایانه خودت و با کلید خودت بسازی (بخش ۵).

---

## ۴) نصب و اجرا روی گوشی

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

| نشانه                                                    | علت احتمالی                     | راه‌حل                                                                |
| -------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| صفحه سفید یا «Unable to load script»                     | بسته debug بدون Metro نصب شده   | بسته release بساز و همان را نصب کن                                    |
| متن‌ها پیش‌فرض اندروید هستند، نه وزیرمتن                 | فونت‌ها در بسته نیستند          | `npm run fonts:link` و بعد ساخت دوباره بسته                           |
| `SDK location not found`                                 | `android/local.properties` نیست | مسیر SDK را در آن فایل بنویس                                          |
| `Unsupported class file major version`                   | JDK خیلی جدید                   | JDK 17 یا 21 نصب کن و `JAVA_HOME` را عوض کن                           |
| `NDK not found` روی یونیتی/ویندوز                        | NDK نصب نشده                    | در SDK Manager نسخه `27.1.12297006` را نصب کن                         |
| گریدل هنگام ساخت دارایی‌ها را دانلود نمی‌کند             | بی‌اینترنتی/فیلترینگ            | یک بار با اینترنت پایدار بساز؛ بعد از آن در `~/.gradle` کش می‌شود     |
| برنامه فوراً بسته می‌شود                                 | داده خراب از نسخه قبلی          | برنامه را حذف و دوباره نصب کن (یا در برنامه «پاک‌کردن پیشرفت» را بزن) |
| ساخت روی ویندوز: «The filename or extension is too long» | مسیر پروژه خیلی عمیق است        | پروژه را در مسیری کوتاه مثل `C:\dev\kalamesaz` بگذار                  |
| «INSTALL_FAILED_UPDATE_INCOMPATIBLE»                     | امضای بسته با نصب قبلی یکی نیست | نسخه قبلی را حذف کن (`adb uninstall ir.kalamesaz.game`)               |

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
