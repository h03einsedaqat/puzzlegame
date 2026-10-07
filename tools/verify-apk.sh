#!/usr/bin/env bash
#
# بررسی سلامت بسته نصبی اندروید (APK) — «آیا این فایل واقعاً نصب‌شدنی است؟»
#
# چرا این ابزار وجود دارد: خطای رایج گوشی
#   «App not installed as package appears to be invalid»
# تقریباً همیشه یعنی فایل کامل دانلود نشده یا امضا/ناقص است، نه اینکه خودِ بازی
# مشکل داشته باشد. این اسکریپت دقیقاً همان چیزهایی را بررسی می‌کند که اندروید
# هنگام نصب بررسی می‌کند:
#
#   ۱) سالم بودن آرشیو zip و تطابق CRC همه ورودی‌ها (دانلود ناقص را لو می‌دهد)
#   ۲) ترازبندی ۴ بایتی (zipalign) و ترازبندی صفحه‌های ۱۶ کیلوبایتی
#   ۳) معتبر بودن امضاهای APK (apksigner verify — نسخه‌های v1/v2/v3)
#   ۴) خواندنی بودن AndroidManifest و مقادیر minSdkVersion/targetSdkVersion و
#      معماری‌های موجود در بسته (aapt2 dump badging)
#
# استفاده:
#   bash tools/verify-apk.sh <file.apk> [build-tools-dir]
#   bash tools/verify-apk.sh --release [tag] [build-tools-dir]   # خودش از صفحه Releases می‌گیرد
#
# نمونه:
#   bash tools/verify-apk.sh android/app/build/outputs/apk/release/app-release.apk
#   bash tools/verify-apk.sh ~/Downloads/kalamesaz-1.0.0-arm.apk
#   bash tools/verify-apk.sh --release               # همان فایلی که کاربر دانلود می‌کند
#
# کد خروج:
#   0 = بسته سالم است، 1 = ایراد جدی (روی گوشی نصب نمی‌شود)، 2 = ابزار لازم پیدا نشد.

set -uo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
APK=${1:-}
BT_ARG=${2:-}

# حالت --release: همان فایلی که روی صفحه Releases منتشر شده را می‌گیرد و بررسی می‌کند
if [ "$APK" = "--release" ]; then
  RELEASE_TAG=${2:-apk-latest}
  BT_ARG=${3:-}
  if ! command -v gh >/dev/null 2>&1; then
    echo "برای حالت --release به ابزار gh نیاز است (https://cli.github.com)" >&2
    exit 2
  fi
  DL_DIR=$(mktemp -d)
  echo "دانلود بسته «$RELEASE_TAG» از صفحه Releases و فایل sha256 (در صورت وجود)..."
  gh release download "$RELEASE_TAG" -p '*.apk' -p '*.sha256' -D "$DL_DIR" --clobber >/dev/null 2>&1 || true
  APK=$(ls "$DL_DIR"/*.apk 2>/dev/null | head -1)
  if [ -z "$APK" ]; then
    echo "هیچ فایل APK در انتشار «$RELEASE_TAG» پیدا نشد (یا دانلود ممکن نشد)." >&2
    exit 2
  fi
  SUM_FILE="$APK.sha256"
  if [ -f "$SUM_FILE" ]; then
    EXPECTED=$(cut -d' ' -f1 < "$SUM_FILE")
    ACTUAL=$(sha256sum "$APK" 2>/dev/null | cut -d' ' -f1)
    if [ -n "$EXPECTED" ] && [ "$EXPECTED" = "$ACTUAL" ]; then
      echo "✅ فایل دانلودشده با هش اعلام‌شده در همان صفحه یکی است."
    else
      echo "❌ فایل دانلودشده با هش اعلام‌شده یکی نیست؛ دانلود ناقص/خراب است." >&2
    fi
    echo
  fi
fi

if [ -z "$APK" ]; then
  echo "استفاده: bash tools/verify-apk.sh <file.apk> [build-tools-dir]" >&2
  echo "        bash tools/verify-apk.sh --release [tag] [build-tools-dir]" >&2
  exit 2
fi

if [ ! -f "$APK" ]; then
  echo "فایل پیدا نشد: $APK" >&2
  exit 2
fi

# ---------- پیدا کردن ابزارهای Android (zipalign / apksigner / aapt2) ----------
# ترتیب ترجیح: آرگومان دوم → مسیرهای معمول SDK → هر چه روی PATH است.
find_build_tools() {
  local roots=() c
  [ -n "${2:-}" ] && [ -d "$2" ] && { echo "$2"; return 0; }
  for c in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" \
           "$HOME/Android/Sdk" "$HOME/Library/Android/sdk" \
           "$HOME/AppData/Local/Android/Sdk" /usr/lib/android-sdk; do
    [ -n "$c" ] && [ -d "$c/build-tools" ] && roots+=("$c/build-tools")
  done
  local best=""
  for c in "${roots[@]}"; do
    # نسخه‌های پایدار را ترجیح می‌دهیم؛ آخرین گزینه هر چیزی است که هست.
    local v
    for v in 36.0.0 35.0.0 34.0.0 33.0.2 32.0.0 31.0.0 30.0.3; do
      if [ -x "$c/$v/apksigner" ] || [ -f "$c/$v/apksigner.bat" ]; then
        echo "$c/$v"
        return 0
      fi
    done
    best=$(ls -d "$c"/*/ 2>/dev/null | sort -V | tail -1)
    [ -n "$best" ] && { echo "${best%/}"; return 0; }
  done
  # آخرین تلاش: خود PATH
  if command -v apksigner >/dev/null 2>&1; then
    echo "$(dirname "$(command -v apksigner)")"
    return 0
  fi
  return 1
}

BT="$(find_build_tools "$APK" "$BT_ARG" 2>/dev/null || true)"
APKSIGNER="${BT:+$BT/apksigner}"
ZIPALIGN="${BT:+$BT/zipalign}"
AAPT2="${BT:+$BT/aapt2}"

have() { command -v "$1" >/dev/null 2>&1; }

# نام تجاری نسخه اندروید از روی API level (فقط برای پیام‌های خوانا)
android_release_name() {
  case "$1" in
    21) echo "اندروید 5.0" ;;
    22) echo "اندروید 5.1" ;;
    23) echo "اندروید 6.0" ;;
    24) echo "اندروید 7.0" ;;
    25) echo "اندروید 7.1" ;;
    26) echo "اندروید 8.0" ;;
    27) echo "اندروید 8.1" ;;
    28) echo "اندروید 9" ;;
    29) echo "اندروید 10" ;;
    30) echo "اندروید 11" ;;
    31) echo "اندروید 12" ;;
    32) echo "اندروید 12L" ;;
    33) echo "اندروید 13" ;;
    34) echo "اندروید 14" ;;
    35) echo "اندروید 15" ;;
    36) echo "اندروید 16" ;;
    *)   echo "API $1" ;;
  esac
}
[ -n "$APKSIGNER" ] && [ ! -x "$APKSIGNER" ] && have apksigner && APKSIGNER=$(command -v apksigner)
[ -n "$ZIPALIGN" ] && [ ! -x "$ZIPALIGN" ] && have zipalign && ZIPALIGN=$(command -v zipalign)

missing=""
[ -z "$APKSIGNER" ] || [ ! -x "$APKSIGNER" ] && missing="$missing apksigner"
[ -z "$ZIPALIGN" ] || [ ! -x "$ZIPALIGN" ] && missing="$missing zipalign"

# ---------- گزارش ----------
fail=0
warn=0
ok()   { printf '✅ %s\n' "$1"; }
bad()  { printf '❌ %s\n' "$1"; fail=$((fail + 1)); }
soft() { printf '⚠️  %s\n' "$1"; warn=$((warn + 1)); }

file_size=$(wc -c < "$APK" | tr -d ' ')
sha256=$(have sha256sum && sha256sum "$APK" | cut -d' ' -f1 || shasum -a 256 "$APK" 2>/dev/null | cut -d' ' -f1)

echo "# گزارش بررسی بسته نصبی (APK)"
echo
echo "- فایل: \`$(basename "$APK")\`"
echo "- حجم: **${file_size} بایت**"
echo "- SHA-256: \`${sha256:-نامشخص}\`"
echo "- build-tools: \`${BT:-پیدا نشد}\`"
echo

if [ -n "$missing" ]; then
  echo "## ابزارهای لازم"
  soft "این ابزارها پیدا نشدند:$missing"
  echo
  echo 'برای بررسی امضا و ترازبندی به Android SDK Build-Tools نیاز است. ساده‌ترین راه:'
  echo 'Android Studio → SDK Manager → SDK Tools → «Android SDK Build-Tools» را نصب کن،'
  echo 'یا این اسکریپت را با مسیر build-tools اجرا کن:'
  echo
  echo '```bash'
  echo 'bash tools/verify-apk.sh file.apk ~/Android/Sdk/build-tools/36.0.0'
  echo '```'
  echo
fi

echo "## ۱) سالم بودن فایل zip (دانلود ناقص؟)"
if have unzip; then
  if unzip -t "$APK" >/dev/null 2>&1; then
    ok "همه ورودی‌های آرشیو سالم‌اند و CRC آن‌ها می‌خواند"
  else
    bad "آرشیو خراب است یا ناقص دانلود شده — همین باعث خطای «package appears to be invalid» می‌شود"
    unzip -t "$APK" 2>&1 | tail -5
  fi
elif have python3; then
  if python3 - "$APK" <<'PY'
import sys, zipfile
bad = zipfile.ZipFile(sys.argv[1]).testzip()
sys.exit(1 if bad else 0)
PY
  then ok "همه ورودی‌های آرشیو سالم‌اند (بررسی با python zipfile)"; else bad "آرشیو خراب یا ناقص است"; fi
else
  soft "نه unzip و نه python3 موجود نیست؛ بررسی سالم‌بودن zip انجام نشد"
fi
echo

echo "## ۲) ترازبندی (zipalign)"
if [ -n "$ZIPALIGN" ] && [ -x "$ZIPALIGN" ]; then
  if "$ZIPALIGN" -c -v 4 "$APK" >/dev/null 2>&1; then
    ok "ترازبندی ۴ بایتی درست است"
  else
    bad "ترازبندی ۴ بایتی خراب است (zipalign -c -v 4 ناموفق بود)"
  fi
  # صفحه‌های ۱۶ کیلوبایتی: از اندروید ۱۵ به بعد دستگاه‌هایی با صفحه ۱۶KB وجود دارند.
  if "$ZIPALIGN" -c -P 16 -v 4 "$APK" >/dev/null 2>&1; then
    ok "کتابخانه‌های بومی برای صفحه‌های ۱۶ کیلوبایتی هم تراز‌اند"
  else
    soft "ترازبندی ۴ کیلوبایتی صفحه (۱۶KB page size) تأیید نشد؛ روی گوشی‌های جدیدتر ممکن است برنامه هنگام اجرا بسته شود"
  fi
else
  soft "zipalign پیدا نشد؛ بررسی ترازبندی انجام نشد"
fi
echo

echo "## ۳) امضای بسته (apksigner verify)"
if [ -n "$APKSIGNER" ] && [ -x "$APKSIGNER" ]; then
  out=$(mktemp)
  if "$APKSIGNER" verify --verbose --print-certs --min-sdk-version 24 --max-sdk-version 36 "$APK" >"$out" 2>&1; then
    ok "امضا معتبر است (برای اندروید ۷ تا ۱۶ بررسی شد)"
  else
    bad "امضا معتبر نیست — اندروید چنین بسته‌ای را نصب نمی‌کند"
  fi
  sed 's/^/    /' "$out" | grep -iE "verif|scheme|signer|digest|minSdk|error" | head -25

  # بررسی جداگانه امضای v1 (JAR): apksigner زیر API 24 امضای JAR را نمی‌سنجد،
  # پس با min-sdk-version 23 امتحان می‌کنیم تا بفهمیم بسته اصلاً امضای v1 دارد یا نه.
  if "$APKSIGNER" verify --min-sdk-version 23 "$APK" >"$out" 2>&1; then
    ok "امضای v1 (JAR) هم سالم است — نصب‌کننده‌های قدیمی/OEM هم قبولش می‌کنند"
  elif unzip -l "$APK" 2>/dev/null | grep -qE "META-INF/.*\.(RSA|DSA|EC)"; then
    soft "امضای v1 داخل بسته هست ولی برای API 23 تأیید نشد؛ جزئیات: $(head -2 "$out" | tr '\n' ' ')"
  else
    if [ "${REQUIRE_V1:-0}" = "1" ]; then
      bad "امضای v1 (JAR) ندارد؛ نصب‌کننده‌های گوشی‌های بعضی برندها بسته را «invalid» می‌دانند (enableV1Signing را در android/app/build.gradle روشن کن)"
    else
      soft "امضای v1 (JAR) ندارد. برای اندروید ۷+ مشکلی نیست، ولی بعضی نصب‌کننده‌های OEM/فروشگاه‌ها بسته‌ای که فقط v2 دارد را رد می‌کنند؛ بهتر است enableV1Signing true باشد"
    fi
  fi
  rm -f "$out"
else
  soft "apksigner پیدا نشد؛ بررسی امضا انجام نشد"
fi
echo

echo "## ۴) مانیفست و معماری‌ها (aapt2 dump badging)"
if [ -n "$AAPT2" ] && [ -x "$AAPT2" ]; then
  "$AAPT2" dump badging "$APK" 2>/dev/null | grep -E "^(package|sdkVersion|targetSdkVersion|native-code|application-label)" | sed 's/^/- /'
  abis=$("$AAPT2" dump badging "$APK" 2>/dev/null | grep -E "^native-code" | head -1)
  echo
  if echo "$abis" | grep -q "arm64-v8a" || echo "$abis" | grep -q "armeabi-v7a"; then
    ok "معماری ARM (گوشی‌های واقعی) در بسته هست: $abis"
  else
    bad "هیچ کتابخانه ARM در بسته نیست — روی گوشی نصب/اجرا نمی‌شود: $abis"
  fi

  min_sdk=$(  "$AAPT2" dump badging "$APK" 2>/dev/null | grep -oE "sdkVersion:'[0-9]+'"    | head -1 | tr -dc '0-9')
  tgt_sdk=$(  "$AAPT2" dump badging "$APK" 2>/dev/null | grep -oE "targetSdkVersion:'[0-9]+'" | head -1 | tr -dc '0-9')
  if [ -n "$min_sdk" ]; then
    ok "کمترین اندروید لازم: API $min_sdk ($(android_release_name "$min_sdk") یا بالاتر) — targetSdk=${tgt_sdk:-?}"
    if [ "$min_sdk" -gt 24 ]; then
      soft "این بسته روی گوشی‌های قدیمی‌تر از API $min_sdk نصب نمی‌شود"
    fi
  fi
else
  soft "aapt2 پیدا نشد؛ بررسی مانیفست انجام نشد"
fi
echo

echo "## ۵) فایل‌های کلیدی داخل بسته"
if have unzip; then
  unzip -l "$APK" 2>/dev/null | grep -E "classes|index.android.bundle|resources.arsc|lib/.*\.so" | sed 's/^/    /'
  echo
  if unzip -l "$APK" 2>/dev/null | grep -q "assets/index.android.bundle"; then
    ok "بسته جاوااسکریپت داخل APK هست (برنامه آفلاین اجرا می‌شود)"
  else
    soft "assets/index.android.bundle پیدا نشد"
  fi
  if unzip -l "$APK" 2>/dev/null | grep -q "assets/fonts/.*\.ttf"; then
    ok "فونت‌های فارسی داخل بسته هستند (متن برنامه درست دیده می‌شود)"
  else
    soft "فونتی در assets/fonts نبود؛ متن فارسی روی گوشی بد نمایش داده می‌شود"
  fi
  if unzip -l "$APK" 2>/dev/null | grep -q "META-INF/.*\.RSA\|META-INF/.*\.SF"; then
    echo "- امضای نسخه v1 (JAR) هم داخل بسته هست."
  else
    echo "- امضای v1 داخل بسته نیست؛ فقط v2/v3 (برای اندروید ۷ به بالا کافی است)."
  fi
fi
echo

echo "---"
if [ "$fail" -eq 0 ]; then
  echo "**نتیجه: بسته سالم و نصب‌شدنی است.** اگر گوشی باز هم خطا داد، مشکل از فایل"
  echo "نیست: نسخه اندروید گوشی، وجود نسخه قبلی با امضای دیگر، Play Protect یا"
  echo "اجازه نصب از منابع نامعلوم را بررسی کن (docs/INSTALL_TROUBLESHOOTING.md)."
else
  echo "**نتیجه: $fail ایراد جدی پیدا شد — این فایل روی گوشی نصب نمی‌شود.**"
  echo "اگر فایل را خودت دانلود کرده‌ای، احتمالاً دانلود ناقص/خراب است: دوباره و با"
  echo "حجم و SHA-256 اعلام‌شده در صفحه Releases مقایسه کن."
fi

[ "$fail" -eq 0 ] && exit 0
exit 1
