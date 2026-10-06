/**
 * ساخت افکت‌های صوتی بازی.
 *
 * اجرا:  npm run sounds:build
 *
 * خروجی: src/assets/sounds/*.wav
 *
 * همه افکت‌ها به‌صورت ریاضی و از صفر ساخته می‌شوند (موج سینوسی با پوش
 * حمله/افت)، بنابراین هیچ فایل صوتی از منبع بیرونی استفاده نمی‌شود و مسئله
 * مجوز وجود ندارد. صداها کوتاه (زیر ۰٫۵ ثانیه) و کم‌حجم‌اند.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SAMPLE_RATE = 22050;
const MAX_AMPLITUDE = 0.72;

interface Tone {
  /** فرکانس پایه به هرتز */
  frequency: number;
  /** مدت زمان صدا به ثانیه */
  duration: number;
  /** فاصله شروع نسبت به آغاز فایل، به ثانیه */
  offset?: number;
  /** حجم نسبی میان ۰ و ۱ */
  gain?: number;
  /** نوع موج؛ مربعی برای حس «بازی» و مثلثی برای صدای نرم‌تر */
  wave?: 'sine' | 'triangle' | 'square';
  /** سرعت افت صدا */
  decay?: number;
}

function waveform(type: Tone['wave'], phase: number, frequency: number): number {
  const cycle = phase * frequency;
  switch (type) {
    case 'square':
      return Math.sin(2 * Math.PI * cycle) >= 0 ? 1 : -1;
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * cycle));
    default:
      return Math.sin(2 * Math.PI * cycle);
  }
}

function renderTones(tones: readonly Tone[]): Float32Array {
  const totalDuration = tones.reduce(
    (longest, tone) => Math.max(longest, (tone.offset ?? 0) + tone.duration),
    0,
  );
  const length = Math.ceil(totalDuration * SAMPLE_RATE);
  const samples = new Float32Array(length);

  for (const tone of tones) {
    const start = Math.floor((tone.offset ?? 0) * SAMPLE_RATE);
    const count = Math.floor(tone.duration * SAMPLE_RATE);
    const gain = tone.gain ?? 0.8;
    const decay = tone.decay ?? 6;
    const attack = Math.min(0.004 * SAMPLE_RATE, count * 0.2);

    for (let index = 0; index < count; index += 1) {
      const position = index / SAMPLE_RATE;
      const attackGain = index < attack ? index / attack : 1;
      const envelope = attackGain * Math.exp(-decay * position);
      const value = waveform(tone.wave ?? 'sine', position, tone.frequency) * envelope * gain;
      const target = start + index;
      if (target < samples.length) {
        samples[target] = (samples[target] ?? 0) + value;
      }
    }
  }

  // محدودسازی نهایی تا خروجی هرگز کلیپ نکند
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > MAX_AMPLITUDE) {
    const scale = MAX_AMPLITUDE / peak;
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = (samples[index] ?? 0) * scale;
    }
  }

  return samples;
}

/** بسته‌بندی نمونه‌ها در قالب WAV مونو ۱۶ بیتی */
function encodeWav(samples: Float32Array): Buffer {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataLength, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }

  return buffer;
}

const SOUNDS: Record<string, readonly Tone[]> = {
  // لمس دکمه‌ها: تیک کوتاه و خشک
  button_press: [{ frequency: 1180, duration: 0.05, wave: 'square', gain: 0.35, decay: 24 }],
  // انتخاب حرف: کوتاه و روشن
  letter_select: [
    { frequency: 720, duration: 0.075, wave: 'triangle', gain: 0.6, decay: 16 },
    { frequency: 1440, duration: 0.05, offset: 0.005, wave: 'sine', gain: 0.25, decay: 20 },
  ],
  letter_remove: [{ frequency: 430, duration: 0.07, wave: 'triangle', gain: 0.55, decay: 18 }],
  // پاسخ درست: دو نت بالارونده
  correct: [
    { frequency: 523.25, duration: 0.12, wave: 'sine', gain: 0.7, decay: 9 },
    { frequency: 659.25, duration: 0.18, offset: 0.09, wave: 'sine', gain: 0.7, decay: 7 },
  ],
  // پاسخ نادرست: دو نت پایین‌رونده با موج مربعی ملایم
  wrong: [
    { frequency: 311.13, duration: 0.13, wave: 'square', gain: 0.32, decay: 12 },
    { frequency: 233.08, duration: 0.2, offset: 0.1, wave: 'square', gain: 0.3, decay: 9 },
  ],
  // دریافت پاداش: سه نت بالارونده
  reward: [
    { frequency: 523.25, duration: 0.1, wave: 'sine', gain: 0.6, decay: 10 },
    { frequency: 659.25, duration: 0.1, offset: 0.07, wave: 'sine', gain: 0.6, decay: 10 },
    { frequency: 783.99, duration: 0.2, offset: 0.14, wave: 'sine', gain: 0.65, decay: 7 },
  ],
  // باز شدن مرحله تازه
  unlock: [
    { frequency: 440, duration: 0.16, wave: 'triangle', gain: 0.6, decay: 8 },
    { frequency: 659.25, duration: 0.28, offset: 0.12, wave: 'triangle', gain: 0.6, decay: 6 },
  ],
  // کمبو: دو بلیپ سریع
  combo: [
    { frequency: 880, duration: 0.07, wave: 'triangle', gain: 0.55, decay: 14 },
    { frequency: 1174.66, duration: 0.11, offset: 0.06, wave: 'triangle', gain: 0.55, decay: 12 },
  ],
  // پایان مرحله: چهار نت جشن‌گونه
  level_complete: [
    { frequency: 523.25, duration: 0.14, wave: 'sine', gain: 0.6, decay: 8 },
    { frequency: 659.25, duration: 0.14, offset: 0.12, wave: 'sine', gain: 0.6, decay: 8 },
    { frequency: 783.99, duration: 0.18, offset: 0.24, wave: 'sine', gain: 0.6, decay: 7 },
    { frequency: 1046.5, duration: 0.34, offset: 0.38, wave: 'sine', gain: 0.62, decay: 5 },
  ],
};

const outputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/sounds');
mkdirSync(outputDir, { recursive: true });

let totalBytes = 0;
for (const [name, tones] of Object.entries(SOUNDS)) {
  const wav = encodeWav(renderTones(tones));
  const filePath = path.join(outputDir, `${name}.wav`);
  writeFileSync(filePath, wav);
  totalBytes += wav.length;
  console.log(`✓ ${name}.wav  (${(wav.length / 1024).toFixed(1)} کیلوبایت)`);
}

console.log(`\nمجموع: ${Object.keys(SOUNDS).length} افکت صوتی، ${(totalBytes / 1024).toFixed(1)} کیلوبایت`);
