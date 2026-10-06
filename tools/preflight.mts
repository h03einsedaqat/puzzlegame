/**
 * بررسی آمادگی محیط ساخت بسته اندروید.
 *
 * اجرا:  npm run android:preflight
 *        npm run android:preflight -- --fix
 *
 * پیش از نخستین `gradlew assembleRelease` اجرا می‌شود و همان چیزهایی را بررسی
 * می‌کند که بیشترین علت شکست ساخت اول هستند: نسخه Node، نسخه JDK، مسیر Android
 * SDK و بسته‌های دقیق SDK (platform، build-tools، NDK). شماره نسخه‌های لازم از
 * خود فایل‌های پروژه خوانده می‌شوند تا با تغییر پیکربندی، این ابزار هم درست
 * بماند. اگر ایراد بازدارنده‌ای پیدا شود با کد خروج ناموفق پایان می‌یابد.
 *
 * JDK و SDK را فقط از متغیرهای محیطی نمی‌خواند؛ جاهای معمول نصب (JDK همراه
 * Android Studio، پوشه‌های استاندارد JDK، مسیر پیش‌فرض SDK) را هم می‌گردد. اگر
 * SDK پیدا شد ولی `android/local.properties` ساخته نشده بود، با گزینه `--fix`
 * همان فایل برایت ساخته می‌شود. (آن فایل در git نمی‌رود.)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID_DIR = join(ROOT, 'android');
const IS_WINDOWS = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const JAVA_BINARY = IS_WINDOWS ? 'java.exe' : 'java';
/** با این گزینه، android/local.properties در صورت نبودن ساخته می‌شود. */
const FIX = process.argv.includes('--fix');
const GUIDE = 'راهنمای کامل: docs/BUILD_AND_RUN.md (بخش ۱)';

interface Problem {
  readonly label: string;
  readonly hint: string;
}

const problems: Problem[] = [];

function ok(label: string, value: string): void {
  console.log(`✓ ${label}: ${value}`);
}

function warn(label: string, value: string, hint?: string): void {
  console.log(`! ${label}: ${value}`);
  if (hint) {
    console.log(`  ${hint}`);
  }
}

function fail(label: string, value: string, hint: string): void {
  console.log(`✗ ${label}: ${value}`);
  problems.push({ label, hint });
}

function info(label: string, value: string): void {
  console.log(`• ${label}: ${value}`);
}

/** خطوط راهنما را برای چاپ زیر ایراد، تودرتو می‌کند. */
function paragraph(lines: readonly string[]): string {
  return lines.join('\n  ');
}

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFile(relativePath)) as Record<string, unknown>;
}

/**
 * مقدارهای نسخه از بلوک ext در android/build.gradle خوانده می‌شوند. بعضی از آن‌ها
 * رشته‌اند (`buildToolsVersion = "37.0.0"`) و بعضی عدد خالی
 * (`compileSdkVersion = 37`)، پس هر دو حالت خوانده می‌شود.
 */
function gradleExt(key: string): string {
  const source = readFile('android/build.gradle');
  const match = new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]+)"|([\\w.]+))`).exec(source);
  const value = match?.[1] ?? match?.[2];
  if (!value) {
    throw new Error(`مقدار ${key} در android/build.gradle پیدا نشد.`);
  }
  return value;
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
    /\">=\s*([\d.]+)"/.exec(JSON.stringify(readJson('package.json').engines))?.[1] ?? '22.13.0';
  const current = process.versions.node;
  if (compareVersions(current, required) >= 0) {
    ok('Node', `${current} (کمترین نسخه لازم ${required})`);
    return;
  }
  fail(
    'Node',
    `${current} — نسخه ${required} یا بالاتر لازم است`,
    paragraph([
      'با nvm نصب کن:',
      '  nvm install && nvm use   (نسخه در فایل .nvmrc ثبت شده)',
      GUIDE,
    ]),
  );
}

/**
 * نسخه JDK. خروجی `java -version` روی stderr می‌آید، پس هر دو جریان خوانده
 * می‌شود؛ در غیر این صورت JDK درست هم «نسخه خوانده نشد» گزارش می‌شد.
 */
function javaVersion(javaCommand: string): string | null {
  const result = spawnSync(javaCommand, ['-version'], { encoding: 'utf8' });
  if (result.error) {
    return null;
  }
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return /version "([^"]+)"/.exec(text)?.[1] ?? null;
}

/** مسیر فایل اجرایی java داخل یک JAVA_HOME، اگر وجود داشته باشد. */
function javaIn(javaHome: string | undefined): string | null {
  if (!javaHome) {
    return null;
  }
  const binary = join(javaHome, 'bin', JAVA_BINARY);
  return existsSync(binary) ? binary : null;
}

interface JdkCandidate {
  readonly home: string;
  readonly source: string;
}

/** جاهایی که JDK معمولاً آنجاست؛ اول JDK همراه Android Studio. */
function jdkCandidates(): JdkCandidate[] {
  const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files';
  const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
  const studioLabel = 'JDK همراه Android Studio';
  const systemLabel = 'JDK نصب‌شده روی سیستم';

  const studio: JdkCandidate[] = IS_WINDOWS
    ? [
        { home: join(programFiles, 'Android', 'Android Studio', 'jbr'), source: studioLabel },
        { home: join(localAppData, 'Programs', 'Android Studio', 'jbr'), source: studioLabel },
      ]
    : IS_MAC
    ? [
        {
          home: '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
          source: studioLabel,
        },
        {
          home: join(homedir(), 'Applications/Android Studio.app/Contents/jbr/Contents/Home'),
          source: studioLabel,
        },
      ]
    : [
        { home: '/opt/android-studio/jbr', source: studioLabel },
        { home: join(homedir(), 'android-studio', 'jbr'), source: studioLabel },
        { home: '/usr/local/android-studio/jbr', source: studioLabel },
        { home: '/snap/android-studio/current/android-studio/jbr', source: studioLabel },
      ];

  const roots = IS_WINDOWS
    ? [
        join(programFiles, 'Eclipse Adoptium'),
        join(programFiles, 'Java'),
        join(programFiles, 'Microsoft'),
      ]
    : IS_MAC
    ? [
        '/Library/Java/JavaVirtualMachines',
        join(homedir(), 'Library', 'Java', 'JavaVirtualMachines'),
      ]
    : ['/usr/lib/jvm', '/usr/java'];

  const installed: JdkCandidate[] = [];
  for (const root of roots) {
    if (!existsSync(root)) {
      continue;
    }
    for (const entry of readdirSync(root)) {
      installed.push({ home: join(root, entry), source: systemLabel });
      if (IS_MAC) {
        // روی مک، خانه واقعی JDK زیر Contents/Home است.
        installed.push({ home: join(root, entry, 'Contents', 'Home'), source: systemLabel });
      }
    }
  }

  return [...studio, ...installed];
}

interface FoundJdk {
  readonly home: string;
  readonly binary: string;
  readonly version: string;
  readonly source: string;
}

function findJdk(): FoundJdk | null {
  for (const candidate of jdkCandidates()) {
    const binary = javaIn(candidate.home);
    if (!binary) {
      continue;
    }
    const version = javaVersion(binary);
    if (version) {
      return { home: candidate.home, binary, version, source: candidate.source };
    }
  }
  return null;
}

/** دستور نصب JDK برای سیستم‌عامل جاری. */
function javaInstallLines(): string[] {
  if (IS_WINDOWS) {
    return [
      'JDK 17 نصب کن:',
      '  winget install EclipseAdoptium.Temurin.17.JDK',
      'یا Android Studio را نصب کن؛ JDK داخل خودش هست.',
    ];
  }
  if (IS_MAC) {
    return [
      'JDK 17 نصب کن:',
      '  brew install --cask temurin@17',
      'یا Android Studio را نصب کن؛ JDK داخل خودش هست.',
    ];
  }
  return [
    'JDK 17 نصب کن:',
    '  sudo apt install openjdk-17-jdk      (فدورا: openjdk-17-devel ، آرچ: jdk17-openjdk)',
    'یا Android Studio را نصب کن؛ JDK داخل خودش هست.',
  ];
}

/** خطوط راهنمای تنظیم JAVA_HOME روی پوشه یک JDK مشخص. */
function javaHomeLines(home: string | null): string[] {
  const lines: string[] = [];
  if (home) {
    lines.push(`این JDK مناسب روی سیستم هست:  ${home}`);
    lines.push('JAVA_HOME را به پوشه‌اش وصل کن:');
  } else {
    lines.push('JAVA_HOME را به پوشه JDK نصب‌شده وصل کن، مثلاً:');
  }
  if (IS_WINDOWS) {
    lines.push(
      `  setx JAVA_HOME "${home ?? 'C:\\Program Files\\Eclipse Adoptium\\jdk-17'}"`,
      'بعد پنجره ترمینال (و اگر بازیابی لازم شد Android Studio) را ببند و دوباره باز کن.',
    );
  } else {
    lines.push(
      `  export JAVA_HOME="${
        home ?? '/usr/lib/jvm/java-17-openjdk-amd64'
      }"   # و همین خط را در ~/.bashrc یا ~/.zshrc بگذار`,
      'بعد ترمینال را ببند و دوباره باز کن.',
    );
  }
  lines.push('گریدل از JAVA_HOME استفاده می‌کند، نه از java روی PATH.', GUIDE);
  return lines;
}

/** React Native 0.87 با JDK 17 یا 21 آزمایش شده است. */
function checkJava(): void {
  const javaHome = process.env.JAVA_HOME?.trim();
  const homeBinary = javaIn(javaHome);

  if (javaHome && !homeBinary) {
    const found = findJdk();
    fail(
      'JDK',
      `JAVA_HOME تنظیم است ولی پوشه‌اش فایل java ندارد: ${javaHome}`,
      paragraph(javaHomeLines(found?.home ?? null)),
    );
    return;
  }

  const binary = homeBinary ?? 'java';
  const version = javaVersion(binary);
  if (!version) {
    const found = findJdk();
    if (found) {
      fail(
        'JDK',
        `java روی PATH نیست؛ ولی این JDK روی سیستم نصب است: ${found.binary} (${found.version})`,
        paragraph([...javaHomeLines(found.home)]),
      );
      return;
    }
    fail('JDK', 'پیدا نشد', paragraph([...javaInstallLines(), GUIDE]));
    return;
  }

  if (compareVersions(version, '17') < 0) {
    fail(
      'JDK',
      `${version} (${binary}) — کمترین نسخه ۱۷ است`,
      paragraph([
        'JDK 8 و 11 برای این پروژه قدیمی‌اند.',
        ...javaInstallLines(),
        ...javaHomeLines(null),
      ]),
    );
    return;
  }

  const source = homeBinary ? 'JAVA_HOME' : 'PATH';
  if (compareVersions(version, '22') >= 0) {
    warn(
      'JDK',
      `${version} (${binary}) — با JDK ۱۷ و ۲۱ آزمایش شده است`,
      'اگر ساخت با خطای «Unsupported class file major version» شکست خورد، JAVA_HOME را به JDK 17 تغییر بده.',
    );
  } else {
    ok('JDK', `${version} (${binary} — ${source})`);
  }

  if (!homeBinary) {
    const better = findJdk();
    info(
      'JAVA_HOME',
      better
        ? `تنظیم نشده؛ گریدل از java روی PATH استفاده می‌کند. JDK دیگری هم نصب است: ${better.home}`
        : 'تنظیم نشده؛ گریدل از java روی PATH استفاده می‌کند. اگر ساخت جاوا ایراد گرفت، JAVA_HOME را تنظیم کن',
    );
  }
}

/** مقدار sdk.dir در local.properties ممکن است `C\:\\Users\\...` نوشته شده باشد. */
function parsePropertiesPath(raw: string): string {
  return raw.trim().replace(/\\(.)/g, '$1').replace(/\\/g, '/');
}

/** همان چیزی که باید در local.properties بنشیند (در ویندوز با escape درست). */
function sdkDirLine(sdkRoot: string): string {
  if (!IS_WINDOWS) {
    return `sdk.dir=${sdkRoot}`;
  }
  return `sdk.dir=${sdkRoot.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}`;
}

interface SdkSource {
  readonly path: string;
  readonly source: string;
}

function configuredSdkRoot(): SdkSource | null {
  if (process.env.ANDROID_HOME) {
    return { path: process.env.ANDROID_HOME, source: 'ANDROID_HOME' };
  }
  if (process.env.ANDROID_SDK_ROOT) {
    return { path: process.env.ANDROID_SDK_ROOT, source: 'ANDROID_SDK_ROOT' };
  }
  const localProperties = join(ANDROID_DIR, 'local.properties');
  if (!existsSync(localProperties)) {
    return null;
  }
  const line = /^sdk\.dir=(.*)$/m.exec(readFileSync(localProperties, 'utf8'));
  if (!line?.[1]) {
    return null;
  }
  return {
    path: resolve(ANDROID_DIR, parsePropertiesPath(line[1])),
    source: 'android/local.properties',
  };
}

function defaultSdkRoots(): string[] {
  if (IS_WINDOWS) {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
    return [
      join(localAppData, 'Android', 'Sdk'),
      join(homedir(), 'Android', 'Sdk'),
      'C:\\Android\\Sdk',
    ];
  }
  if (IS_MAC) {
    return [
      join(homedir(), 'Library', 'Android', 'sdk'),
      join(homedir(), 'Library', 'Android', 'Sdk'),
    ];
  }
  return [join(homedir(), 'Android', 'Sdk'), join(homedir(), 'Android', 'sdk'), '/opt/android-sdk'];
}

function sdkInstallLines(): string[] {
  const install = IS_WINDOWS
    ? '  winget install Google.AndroidStudio'
    : IS_MAC
    ? '  brew install --cask android-studio'
    : '  sudo snap install android-studio --classic      (یا از سایت اندروید دانلود کن)';
  return [
    'Android Studio را نصب کن؛ هنگام نصب «Android SDK» را هم انتخاب کن:',
    install,
    'اگر Android Studio را از قبل داری، فقط ابزارهای خط فرمان را بگیر:',
    '  https://developer.android.com/studio#command-line-tools-only',
    'بعد در SDK Manager این‌ها را نصب کن:',
    '  SDK Platforms → Android SDK Platform 37',
    '  SDK Tools → Android SDK Build-Tools 37.0.0 ، NDK (Side by side) 27.1.12297006 ، Android SDK Platform-Tools',
    'و مسیر SDK را به پروژه بگو (یکی از این دو):',
    '  npm run android:preflight -- --fix        ← خودش android/local.properties را می‌سازد',
    '  یا خودت این خط را در android/local.properties بنویس:  sdk.dir=<مسیر SDK>',
    GUIDE,
  ];
}

/** sdk.dir را در local.properties می‌نویسد؛ اگر فایل هست، فقط همان خط را به‌روز می‌کند. */
function writeSdkDir(sdkRoot: string): void {
  const file = join(ANDROID_DIR, 'local.properties');
  const line = sdkDirLine(sdkRoot);
  if (existsSync(file)) {
    const current = readFileSync(file, 'utf8');
    writeFileSync(
      file,
      /^sdk\.dir=/m.test(current)
        ? current.replace(/^sdk\.dir=.*$/m, line)
        : `${current.replace(/\s*$/, '')}\n${line}\n`,
      'utf8',
    );
    return;
  }
  writeFileSync(
    file,
    [
      '# این فایل محلی است و در git نمی‌رود.',
      '# با اجرای «npm run android:preflight -- --fix» ساخته شده است.',
      line,
      '',
    ].join('\n'),
    'utf8',
  );
}

function checkSdkPackages(sdk: string): void {
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
    IS_WINDOWS ? 'sdkmanager.bat' : 'sdkmanager',
  );
  const args = missing.map(item => `"${item}"`).join(' ');
  const lines = ['با این دستور نصب کن:'];
  if (existsSync(sdkManager)) {
    lines.push(`  "${sdkManager}" ${args}`);
  } else {
    lines.push(
      '  cmdline-tools در SDK نیست؛ همین بسته‌ها را از SDK Manager خود Android Studio نصب کن:',
      ...missing.map(item => `    ${item}`),
      `  (یا اگر sdkmanager داری: sdkmanager ${args})`,
    );
  }
  lines.push(GUIDE);
  fail('بسته‌های SDK', `${missing.join(' , ')} نصب نیست`, paragraph(lines));
}

function checkSdk(): void {
  const configured = configuredSdkRoot();
  if (configured) {
    if (existsSync(configured.path)) {
      ok('Android SDK', `${configured.path}  (از ${configured.source})`);
      checkSdkPackages(configured.path);
      return;
    }
    fail(
      'Android SDK',
      `این مسیر وجود ندارد: ${configured.path}  (از ${configured.source})`,
      paragraph(sdkInstallLines()),
    );
    return;
  }

  const detected = defaultSdkRoots().find(root => existsSync(root));
  if (!detected) {
    fail('Android SDK', 'مسیر SDK پیدا نشد', paragraph(sdkInstallLines()));
    return;
  }

  if (FIX) {
    writeSdkDir(detected);
    ok('Android SDK', `${detected} — در android/local.properties نوشته شد`);
    checkSdkPackages(detected);
    return;
  }

  fail(
    'Android SDK',
    `${detected} پیدا شد، ولی ANDROID_HOME تنظیم نیست و android/local.properties هم ساخته نشده`,
    paragraph([
      'خودکار بساز:',
      '  npm run android:preflight -- --fix',
      'یا این خط را در android/local.properties بنویس:',
      `  ${sdkDirLine(detected)}`,
      GUIDE,
    ]),
  );
}

function checkWrapper(): void {
  const wrapper = join(ANDROID_DIR, IS_WINDOWS ? 'gradlew.bat' : 'gradlew');
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
    const hasToolchainProblem = problems.some(problem =>
      ['JDK', 'Android SDK', 'بسته‌های SDK'].includes(problem.label),
    );
    if (hasToolchainProblem) {
      console.log('\n— راه دیگر —');
      console.log(
        '  اگر نمی‌خواهی JDK و Android SDK را روی رایانه‌ات نصب کنی، بسته را روی سرور گیت‌هاب بساز:',
      );
      console.log('  docs/BUILD_AND_RUN.md (بخش ۳)');
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
