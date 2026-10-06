/**
 * بررسی آمادگی محیط ساخت بسته اندروید.
 *
 * اجرا:  npm run android:preflight
 *
 * پیش از نخستین `gradlew assembleRelease` اجرا می‌شود و همان چیزهایی را بررسی
 * می‌کند که بیشترین علت شکست ساخت اول هستند: نسخه Node، نسخه JDK، مسیر Android
 * SDK و بسته‌های دقیق SDK (platform، build-tools، NDK). شماره نسخه‌های لازم از
 * خود فایل‌های پروژه خوانده می‌شوند تا با تغییر پیکربندی، این ابزار هم درست
 * بماند. اگر ایراد بازدارنده‌ای پیدا شود با کد خروج ناموفق پایان می‌یابد.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID_DIR = join(ROOT, 'android');

interface Problem {
  readonly label: string;
  readonly hint: string;
}

const problems: Problem[] = [];

function ok(label: string, value: string): void {
  console.log(`✓ ${label}: ${value}`);
}

function fail(label: string, value: string, hint: string): void {
  console.log(`✗ ${label}: ${value}`);
  problems.push({ label, hint });
}

function info(label: string, value: string): void {
  console.log(`• ${label}: ${value}`);
}

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

/** مقدارهای نسخه از بلوک ext در android/build.gradle خوانده می‌شوند. */
function gradleExt(key: string): string {
  const source = readFile('android/build.gradle');
  const match = new RegExp(`${key}\\s*=\\s*"([^"]+)"`).exec(source);
  if (!match?.[1]) {
    throw new Error(`مقدار ${key} در android/build.gradle پیدا نشد.`);
  }
  return match[1];
}

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function checkNode(): void {
  const required =
    /">=\s*([\d.]+)"/.exec(JSON.stringify(readJson('package.json').engines))?.[1] ?? '22.13.0';
  const current = process.versions.node;
  if (compareVersions(current, required) >= 0) {
    ok('Node', `${current} (کمترین نسخه لازم ${required})`);
    return;
  }
  fail(
    'Node',
    `${current} — نسخه ${required} یا بالاتر لازم است`,
    'با nvm نصب کن:  nvm install && nvm use   (نسخه در فایل .nvmrc ثبت شده)',
  );
}

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFile(relativePath)) as Record<string, unknown>;
}

/** خروجی `java -version` روی stderr می‌آید، پس هر دو جریان خوانده می‌شود. */
function javaVersion(javaCommand: string): string | null {
  try {
    const output = execFileSync(javaCommand, ['-version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return /version "([^"]+)"/.exec(output)?.[1] ?? null;
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
    return /version "([^"]+)"/.exec(stderr)?.[1] ?? null;
  }
}

function candidateJava(): string | null {
  const home = process.env.JAVA_HOME;
  if (home) {
    const binary = join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (existsSync(binary)) {
      return binary;
    }
  }
  return javaVersion('java') ? 'java' : null;
}

function checkJava(): void {
  const java = candidateJava();
  if (!java) {
    fail(
      'JDK',
      'پیدا نشد',
      'JDK 17 نصب کن (Temurin) و متغیر JAVA_HOME را به پوشه آن تنظیم کن؛ سپس همین دستور را دوباره اجرا کن',
    );
    return;
  }
  const version = javaVersion(java);
  if (!version) {
    fail('JDK', `نسخه از ${java} خوانده نشد`, 'خروجی «java -version» را بررسی کن');
    return;
  }
  if (compareVersions(version, '17') < 0) {
    fail('JDK', `${version} — کمترین نسخه ۱۷ است`, 'JDK 17 نصب کن و JAVA_HOME را به آن تغییر بده');
    return;
  }
  ok('JDK', `${version} (${java})`);
}

function androidSdkRoot(): string | null {
  const fromEnv = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (fromEnv) {
    return fromEnv;
  }
  const localProperties = join(ANDROID_DIR, 'local.properties');
  if (!existsSync(localProperties)) {
    return null;
  }
  const line = /^sdk\.dir=(.+)$/m.exec(readFileSync(localProperties, 'utf8'));
  if (!line?.[1]) {
    return null;
  }
  const value = line[1].trim().replace(/\\\\/g, '/');
  return resolve(ANDROID_DIR, value);
}

function checkSdk(): void {
  const sdk = androidSdkRoot();
  if (!sdk || !existsSync(sdk)) {
    fail(
      'Android SDK',
      'مسیر SDK پیدا نشد',
      'Android Studio را نصب کن، در SDK Manager بسته‌های لازم را بگیر و مسیر را در android/local.properties بنویس:  sdk.dir=/path/to/Android/Sdk',
    );
    return;
  }
  ok('Android SDK', sdk);

  const required = [
    {
      label: 'platforms;android-' + gradleExt('compileSdkVersion'),
      path: 'platforms/android-' + gradleExt('compileSdkVersion'),
    },
    {
      label: 'build-tools;' + gradleExt('buildToolsVersion'),
      path: 'build-tools/' + gradleExt('buildToolsVersion'),
    },
    { label: 'ndk;' + gradleExt('ndkVersion'), path: 'ndk/' + gradleExt('ndkVersion') },
    { label: 'platform-tools', path: 'platform-tools' },
  ];

  const missing = required
    .filter(item => !existsSync(join(sdk, item.path)))
    .map(item => item.label);
  if (missing.length === 0) {
    ok('بسته‌های SDK', required.map(item => item.label).join(' , '));
    return;
  }
  const sdkManager = join(
    sdk,
    'cmdline-tools',
    'latest',
    'bin',
    process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager',
  );
  fail(
    'بسته‌های SDK',
    `نصب نیست: ${missing.join(' , ')}`,
    `با این دستور نصب کن:\n  "${sdkManager}" ${missing.map(item => `"${item}"`).join(' ')}`,
  );
}

function checkWrapper(): void {
  const wrapper = join(ANDROID_DIR, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  if (existsSync(wrapper)) {
    ok('Gradle wrapper', 'android/gradlew');
    return;
  }
  fail(
    'Gradle wrapper',
    'android/gradlew پیدا نشد',
    'فایل‌های android/gradle و android/gradlew باید در مخزن باشند؛ آن‌ها را بازگردان',
  );
}

function checkSigning(): void {
  const keystoreProperties = join(ANDROID_DIR, 'keystore.properties');
  if (existsSync(keystoreProperties)) {
    ok('امضای انتشار', 'با کلید خودت (android/keystore.properties)');
    return;
  }
  info(
    'امضای انتشار',
    'کلید انتشار تنظیم نشده؛ بسته با کلید debug امضا می‌شود و برای نصب آزمایشی روی گوشی مناسب است، ولی برای کافه‌بازار باید کلید خودت را بسازی (docs/BUILD_AND_RUN.md)',
  );
}

function checkFonts(): void {
  const fontsDir = join(ROOT, 'src', 'assets', 'fonts');
  const fonts = existsSync(fontsDir)
    ? readdirSync(fontsDir).filter(name => name.endsWith('.ttf'))
    : [];
  if (fonts.length > 0) {
    ok('فونت‌های فارسی', `${fonts.length} فایل (هنگام ساخت به بسته کپی می‌شوند)`);
    return;
  }
  fail(
    'فونت‌های فارسی',
    'فایل ttf در src/assets/fonts نیست',
    'فونت وزیرمتن را برگردان (docs/BUILD_AND_RUN.md) و سپس npm run fonts:link را اجرا کن',
  );
}

function main(): void {
  console.log('— بررسی محیط ساخت اندروید —');
  checkNode();
  checkJava();
  checkSdk();
  checkWrapper();
  checkFonts();
  checkSigning();

  if (problems.length > 0) {
    console.log('\n— کارهای لازم —');
    for (const problem of problems) {
      console.log(`\n${problem.label}\n  ${problem.hint}`);
    }
    throw new Error(`${problems.length} ایراد بازدارنده پیدا شد.`);
  }

  console.log('\n✓ محیط آماده است. برای ساخت بسته نصب:  npm run android:apk:release');
}

try {
  main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
