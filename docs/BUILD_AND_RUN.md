# راهنمای ساخت و نصب روی گوشی

این سند دو مسیر دارد: نسخه آزمایشی سریع (برای دیدن بازی روی گوشی خودت) و نسخه
انتشار امضاشده (برای فرستادن به کافه‌بازار).

---

## ۰) پیش‌نیازهای یک‌بار برای همیشه

### Node.js

نسخه ۲۲.۱۳ یا بالاتر لازم است (فایل `.nvmrc` هم همین را می‌گوید).

```bash
node -v      # باید 22.13.0 یا بالاتر باشد
```

### JDK

React Native 0.87 با **JDK 17 یا 21** کار می‌کند. اگر Java نداری:

- ویندوز/مک: [Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17)
- اوبونتو/دبیان: `sudo apt install openjdk-17-jdk`

بررسی:

```bash
java -version     # باید 17.x یا 21.x باشد
```

### Android SDK

ساده‌ترین راه، نصب [Android Studio](https://developer.android.com/studio) است؛
هنگام نصب، «Android SDK» و «Android SDK Platform-Tools» را انتخاب کن. سپس در
Android Studio → Settings → Languages & Frameworks → Android SDK:

- **SDK Platforms**: تیک `Android 16 (API 36)` و در تب «Show Package Details»
  گزینه `Android SDK Platform 37` را نصب کن.
- **SDK Tools**: تیک `Android SDK Build-Tools 37`.

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

---

## ۱) نسخه آزمایشی: نصب سریع روی گوشی

### الف) با کابل USB

```bash
npm install
npm run fonts:link       # کپی فونت وزیرمتن به دارایی‌های اندروید
npm run android          # ساخت + نصب + اجرای برنامه
```

گوشی باید «USB Debugging» روشن داشته باشد (Settings → About phone → روی Build
number هفت بار بزن → Developer options → USB debugging).

اگر برنامه نصب شد ولی صفحه سفید بود، Metro را جدا اجرا کن:

```bash
npm start                # در یک ترمینال
npm run android          # در ترمینال دیگر
```

### ب) بدون کابل: ساخت فایل نصبی و کپی روی گوشی

```bash
npm run android:bundle:debug
```

خروجی: `android/app/build/outputs/apk/debug/app-debug.apk`

این فایل را با کابل، بلوتوث یا پیام‌رسان به گوشی بفرست، روی گوشی لمس کن و
«نصب از منابع نامعلوم» را برای همان برنامه (مثلاً فایل‌منیجر) اجازه بده.

> نکته: نسخه debug بسته `ir.kalamesaz.game.debug` است و می‌تواند کنار نسخه اصلی
> نصب شود. برای تست چند نفر لازم نیست امضا بسازی.

اگر خواستی از ترمینال نصب کنی:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ۲) نسخه انتشار: امضاشده برای کافه‌بازار

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
دیگری گذاشتی، همین مسیر را اصلاح کن.

### ج) ساخت خروجی

```bash
npm run android:apk:release    # APK
npm run android:aab:release    # AAB (مسیر پیشنهادی کافه‌بازار)
```

خروجی‌ها:

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

برای بارگذاری چندبسته‌ای (APK جدا برای هر معماری CPU):

```bash
npm run android:apk:splits
```

### د) نصب نسخه انتشار روی گوشی خودت

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

اگر خطای «امضای متفاوت» گرفتی (چون نسخه debug قبلاً نصب بوده):

```bash
adb uninstall ir.kalamesaz.game
adb uninstall ir.kalamesaz.game.debug
```

---

## ۳) اگر روی گوشی درست بالا نیامد

| نشانه | علت احتمالی | راه‌حل |
| --- | --- | --- |
| صفحه سفید یا خطای «Unable to load script» | Metro در دسترس نیست | `npm start` را اجرا کن یا بسته release بساز |
| متن‌ها پیش‌فرض اندروید هستند، نه وزیرمتن | فونت‌ها در بسته نیستند | `npm run fonts:link` و بعد ساخت دوباره بسته |
| `SDK location not found` | `android/local.properties` نیست | مسیر SDK را در آن فایل بنویس |
| `Unsupported class file major version` | JDK خیلی جدید | JDK 17 یا 21 نصب کن |
| گریدل هنگام ساخت دارایی‌ها را دانلود نمی‌کند | بی‌اینترنتی/فیلترینگ | یک بار با اینترنت پایدار بساز؛ بعد از آن کش می‌شود |
| برنامه فوراً بسته می‌شود | داده خراب از نسخه قبلی | برنامه را حذف و دوباره نصب کن (یا در برنامه «پاک‌کردن پیشرفت» را بزن) |
| ساخت روی ویندوز: «The filename or extension is too long» | مسیر پروژه خیلی عمیق است | پروژه را در مسیری کوتاه مثل `C:\dev\kalamesaz` بگذار |

برای دیدن لاگ‌های گوشی:

```bash
npx react-native log-android
# یا
adb logcat *:S ReactNative:V ReactNativeJS:V
```

---

## ۴) پیش از انتشار

فهرست کامل کارها در `docs/BAZAAR_RELEASE_CHECKLIST.md` است. خلاصه حداقلی:

```bash
npm run verify          # typecheck + lint + test
npm run levels:check    # اعتبارسنجی داده مرحله‌ها
npm run data:check      # همان بررسی، نام کوتاه‌تر
```
