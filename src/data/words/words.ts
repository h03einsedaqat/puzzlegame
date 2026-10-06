import type { WordCategory, WordEntry, WordTier } from './types';

/**
 * واژه‌نامه بازی.
 *
 * واژه‌ها دستی و بر پایه کاربرد روزمره فارسی انتخاب شده‌اند: کوتاه، رایج،
 * قابل فهم برای عموم و مناسب بازی خانوادگی. از نام افراد، برندها، واژه‌های
 * نادر و هر واژه نامناسب پرهیز شده است.
 *
 * همه واژه‌ها تک‌توکن و در شکل متعارف هستند (ی و ک فارسی، بدون نیم‌فاصله و
 * بدون فاصله) چون در بازی هر واژه از کاشی‌های حروف ساخته می‌شود و کاشی
 * نیم‌فاصله وجود ندارد.
 */
function group(category: WordCategory, tier: WordTier, words: string): WordEntry[] {
  return words
    .trim()
    .split(/\s+/)
    .map(word => ({ word, category, tier }));
}

const natureBasic = group(
  'طبیعت',
  'basic',
  ` آب خاک باد ابر برف باران ماه خورشید ستاره درخت برگ گل ریشه جنگل دشت کوه دریا رود چشمه ساحل سنگ شن آسمان زمین هوا آتش دود شعله شب روز صبح ظهر عصر غروب فصل بهار پاییز زمستان سرما گرما نور سایه مه نسیم طوفان رعد برق یخ کویر بیابان جزیره دریاچه آبشار تپه چمن دانه میوه جوانه شبنم تابستان `,
);

const natureExtended = group(
  'طبیعت',
  'extended',
  ` دامنه قله بوته ساقه شاخه صخره ریگ موج طلوع افق کهکشان سیاره آفتاب گردباد بارش تگرگ چراگاه نیزار بیشه سبزه شکوفه پرنده لانه `,
);

const animalsBasic = group(
  'حیوانات',
  'basic',
  ` سگ گربه مرغ خروس جوجه کبوتر گنجشک کلاغ عقاب جغد طوطی ماهی کوسه نهنگ دلفین اسب گاو گوسفند بز شتر فیل شیر پلنگ گرگ روباه خرس خرگوش موش مار قورباغه زنبور مورچه پروانه کرم عقرب عنکبوت ملخ آهو گوزن زرافه میمون کبک بلبل طاووس سنجاب خفاش پشه مگس `,
);

const animalsExtended = group(
  'حیوانات',
  'extended',
  ` شاهین ببر راسو سمور خرچنگ صدف جیرجیرک سوسک زاغ سار چکاوک هدهد `,
);

const homeBasic = group(
  'خانه',
  'basic',
  ` خانه اتاق در پنجره دیوار سقف فرش مبل میز صندلی تخت بالش پتو پرده چراغ لامپ آینه کمد کشو قفسه کاغذ نامه جعبه کلید قفل زنگ ساعت یخچال اجاق بشقاب قاشق چنگال کارد لیوان کاسه پارچ سینی حوله صابون شانه سبد سطل جارو طناب سیم میخ چکش متر قیچی سوزن نخ `,
);

const homeExtended = group(
  'خانه',
  'extended',
  ` استکان سماور گلدان پشتی تشک ملافه روتختی دستمال کتری قوری رنده الک `,
);

const familyBasic = group(
  'خانواده',
  'basic',
  ` مادر پدر خواهر برادر دختر پسر بچه نوزاد زن مرد عمو دایی خاله عمه همسر خانواده دوست معلم شاگرد استاد مردم کودک `,
);

const familyExtended = group(
  'خانواده',
  'extended',
  ` همسایه فامیل پدربزرگ نوه عروس داماد خویشاوند `,
);

const foodBasic = group(
  'خوراکی',
  'basic',
  ` نان برنج ماست شیر پنیر کره عسل مربا گوشت کباب خورش آش سوپ پلو سالاد سیب گلابی انگور هلو گیلاس توت انار انجیر خرما موز پرتقال نارنگی لیمو هندوانه خربزه طالبی خیار گوجه پیاز سیر هویج کلم کاهو اسفناج بادمجان نخود لوبیا عدس روغن نمک فلفل شکر چای قهوه بستنی شکلات کیک نبات حلوا شیرینی `,
);

const foodExtended = group(
  'خوراکی',
  'extended',
  ` زردچوبه دارچین زعفران آبمیوه بیسکویت پفک آلبالو زردآلو شلغم چغندر کدو باقلا کنجد `,
);

const clothingBasic = group(
  'پوشاک',
  'basic',
  ` لباس پیراهن شلوار کاپشن کت کفش جوراب کلاه شال روسری دستکش کمربند دکمه یقه آستین چادر مانتو کیف چکمه صندل `,
);

const clothingExtended = group('پوشاک', 'extended', ` پالتو بلوز دامن شلوارک کراوات عبا `);

const schoolBasic = group(
  'مدرسه',
  'basic',
  ` مدرسه کلاس درس کتاب دفتر معلم شاگرد تخته گچ امتحان سوال جواب نمره دانش علم `,
);

const schoolExtended = group('مدرسه', 'extended', ` جزوه آزمون کتابخانه `);

const universityBasic = group('دانشگاه', 'basic', ` دانشگاه دانشجو استاد رشته پژوهش آزمایشگاه `);

const universityExtended = group('دانشگاه', 'extended', ` سخنرانی همایش مقاله ترجمه مطالعه کلاسور `);

const jobBasic = group(
  'شغل',
  'basic',
  ` دکتر پرستار خلبان راننده آشپز نانوا قصاب بقال نجار آهنگر خیاط فروشنده کشاورز ماهیگیر نویسنده شاعر نقاش خواننده بازیگر کارگر پلیس سرباز قاضی وکیل `,
);

const jobExtended = group('شغل', 'extended', ` حسابدار آرایشگر دامدار نگهبان باغبان جوشکار بنا `);

const techBasic = group(
  'فناوری',
  'basic',
  ` رایانه موبایل تلفن گوشی صفحه برنامه اینترنت شبکه ایمیل دوربین باتری شارژ هدفون اسپیکر پرینتر ماوس کیبورد فایل پوشه رمز پیام ویدیو عکس صدا `,
);

const techExtended = group('فناوری', 'extended', ` ربات دانلود آپلود سایت دیجیتال هوشمند حافظه پردازنده `);

const travelBasic = group(
  'سفر',
  'basic',
  ` سفر راه جاده ماشین اتوبوس قطار هواپیما کشتی قایق دوچرخه موتور بلیت چمدان هتل مسافر ایستگاه فرودگاه بندر پل تونل `,
);

const travelExtended = group('سفر', 'extended', ` بنزین کاروان گذرنامه توریست نقشه سفرنامه `);

const cityBasic = group(
  'شهر',
  'basic',
  ` خیابان کوچه میدان پارک بازار مغازه رستوران بیمارستان داروخانه مسجد بانک پست برج روستا شهر کشور استان `,
);

const cityExtended = group(
  'شهر',
  'extended',
  ` شهرداری نانوایی آرایشگاه ورزشگاه سینما موزه چهارراه بزرگراه `,
);

const placeBasic = group('مکان', 'basic', ` باغ باغچه مزرعه انبار کارگاه کارخانه اداره هتل `);

const placeExtended = group('مکان', 'extended', ` اقامتگاه اردوگاه نمایشگاه فروشگاه پارکینگ `);

const objectBasic = group(
  'اشیا',
  'basic',
  ` توپ زنجیر آهن مس چوب شیشه مقوا چرم پلاستیک لاستیک نفت گاز زغال دسته تیغه پیچ `,
);

const objectExtended = group('اشیا', 'extended', ` فانوس ترازو آهنربا `);

const sportBasic = group(
  'ورزش',
  'basic',
  ` ورزش توپ دروازه تیم بازیکن داور مسابقه قهرمان مدال شنا فوتبال والیبال بسکتبال کشتی دویدن شمشیر `,
);

const sportExtended = group('ورزش', 'extended', ` ژیمناستیک اسکیت شناگری `);

const bodyBasic = group(
  'بدن',
  'basic',
  ` بدن سر دست پا چشم گوش بینی دهان دندان زبان مو قلب ریه معده مغز استخوان خون پوست ناخن زانو شانه انگشت صورت ابرو `,
);

const bodyExtended = group('بدن', 'extended', ` آرنج مچ ران ساق گردن کتف رگ عصب تنفس `);

const verbBasic = group(
  'افعال',
  'basic',
  ` رفت آمد خورد نوشت خواند دید شنید گفت کرد شد بود داشت داد گرفت خرید فروخت ساخت دوید پرید نشست خوابید پوشید شست بست شکست ریخت کشید زد خواست دانست ماند رسید برد آورد گذاشت برداشت انداخت افتاد ایستاد یافت خندید رقصید `,
);

const verbExtended = group('افعال', 'extended', ` برخاست آویخت توانست راند چرخید لرزید جوشید پخت `);

const adjectiveBasic = group(
  'صفت‌ها',
  'basic',
  ` بزرگ کوچک بلند کوتاه تازه کهنه نو گرم سرد تلخ شیرین شور ترش خوب بد زیبا تند کند سنگین سبک نرم سخت آسان تمیز پر خالی روشن تاریک سفید سیاه سرخ سبز آبی زرد بنفش نارنجی خاکستری صورتی طلایی شاد غمگین خوشحال مهربان دانا توانا جوان پیر تیز پاک گران ارزان خوشمزه خسته گرسنه تشنه شجاع ترسو راست ساده مهم عجیب قشنگ `,
);

const adjectiveExtended = group(
  'صفت‌ها',
  'extended',
  ` پیچیده آرام دلپذیر نیرومند سردرگم `,
);

const timeBasic = group(
  'زمان',
  'basic',
  ` وقت زمان سال ماه هفته روز شب ساعت دقیقه ثانیه امروز فردا دیروز بامداد لحظه `,
);

const timeExtended = group('زمان', 'extended', ` تقویم سالگرد `);

const generalBasic = group(
  'عمومی',
  'basic',
  ` اسم نام کلمه حرف جمله زبان شعر داستان قصه خبر بازی سرگرمی آرامش خواب رویا خاطره امید ترس شادی غم خنده گریه سکوت موسیقی آهنگ ساز رقص جشن تولد کادو هدیه عید نوروز رنگ نقشه مسئله یاد `,
);

const generalExtended = group(
  'عمومی',
  'extended',
  ` افسانه معما جدول سرنخ پاداش امتیاز درجه رتبه `,
);

/**
 * دسته دوم واژه‌ها: تکمیل‌کننده پوشش موضوعی و تراکم واژه‌های کوتاه.
 * تراکم واژه‌های سه‌ و چهارحرفی باعث می‌شود هر مجموعه حرف، جواب‌های کافی و
 * قابل کشف داشته باشد.
 */
const natureMore = group(
  'طبیعت',
  'basic',
  ` مهتاب قطره رگبار سیل سیلاب خزه تالاب سرزمین رودخانه کوهستان خشکسالی `,
);

const animalsMore = group(
  'حیوانات',
  'basic',
  ` قو لکلک دارکوب پرستو چلچله گوساله بره بزغاله `,
);

const homeMore = group(
  'خانه',
  'basic',
  ` حیاط ایوان بالکن انباری زیرزمین نرده پله پلکان آشپزخانه بام درب راهرو `,
);

const foodMore = group(
  'خوراکی',
  'basic',
  ` صبحانه ناهار شام قند گردو بادام پسته کشمش تخمه آجیل زیتون ترشی خامه دوغ شربت کوکو املت عدسی حلیم فرنی `,
);

const foodMoreExtended = group('خوراکی', 'extended', ` سرشیر آبلیمو کتلت شله `);

const clothingMore = group(
  'پوشاک',
  'basic',
  ` جلیقه گوشواره انگشتر دستبند گردنبند عینک چتر `,
);

const schoolMore = group('مدرسه', 'basic', ` مشق تمرین تکلیف `);

const universityMore = group('دانشگاه', 'extended', ` کنفرانس سمینار ترم واحد `);

const jobMore = group('شغل', 'basic', ` مهندس پزشک مدیر کارمند منشی مترجم `);

const jobMoreExtended = group('شغل', 'extended', ` داروساز عکاس خبرنگار محقق `);

const techMore = group(
  'فناوری',
  'basic',
  ` تبلت کابل سرور مانیتور نمایشگر اسکنر هدست کاربر `,
);

const travelMore = group(
  'سفر',
  'basic',
  ` تاکسی اسکله ترمینال پرواز مسیر مقصد مبدا آژانس `,
);

const cityMore = group(
  'شهر',
  'basic',
  ` بلوار مترو اتوبان تقاطع درمانگاه پاسگاه سوپرمارکت `,
);

const objectMore = group(
  'اشیا',
  'basic',
  ` قوطی بشکه لوله تسمه آچار فرغون نردبان کارتن پرگار دفترچه چسب `,
);

const sportMore = group(
  'ورزش',
  'basic',
  ` مربی تماشاگر هوادار جام لیگ کاپ رکورد پرش پرتاب `,
);

const bodyMore = group('بدن', 'basic', ` مژه گونه چانه پیشانی کمر سینه شکم `);

const bodyMoreExtended = group('بدن', 'extended', ` روده کبد کلیه `);

const verbMore = group(
  'افعال',
  'basic',
  ` شمرد افزود پرسید بوسید سوخت دوخت بافت کاشت فهمید آموخت `,
);

const adjectiveMore = group(
  'صفت‌ها',
  'basic',
  ` خنک خشک سفت باریک پهن تنگ عمیق درشت ریز کامل درست غلط شاداب خندان `,
);

const adjectiveMoreExtended = group('صفت‌ها', 'extended', ` گسترده دلگرم `);

const timeMoreExtended = group('زمان', 'extended', ` هفتگی ماهانه سالانه `);

const generalMore = group(
  'عمومی',
  'basic',
  ` حکایت روزنامه مجله ترانه آواز سرود ملودی نقاشی تصویر بادبادک عروسک `,
);

const generalMoreExtended = group('عمومی', 'extended', ` پند `);

const countingMore = group(
  'عمومی',
  'basic',
  ` عدد رقم شماره جمع ضرب تقسیم مساوی نیم هزار میلیون `,
);

const houseMore = group(
  'خانه',
  'basic',
  ` پاساژ ساختمان آپارتمان ویلا مجتمع `,
);

const objectBatchThree = group(
  'اشیا',
  'basic',
  ` فندک کبریت شمع پیاله دیگ ملاقه کفگیر پیمانه کیسه نایلون سیخ `,
);

const generalMoreThree = group(
  'عمومی',
  'basic',
  ` مهمانی مسافرت تعطیلات آرزو هدف موفق تلاش پیروزی شطرنج پازل `,
);

const schoolMoreThree = group('مدرسه', 'extended', ` مدرک دیپلم کارنامه `);

const techMoreThree = group('فناوری', 'basic', ` شارژر میکروفون بلوتوث دیسک `);

const animalMoreThree = group('حیوانات', 'basic', ` غاز اردک بوقلمون مارمولک سوسمار `);

const verbMoreThree = group(
  'افعال',
  'basic',
  ` بلعید لیسید مالید فشرد کوبید برید `,
);

const adjectiveMoreThree = group('صفت‌ها', 'basic', ` شلوغ خلوت مودب مرتب سیر `);

const alefMaddaWords = group(
  'عمومی',
  'basic',
  ` آجر آدم آسان آهنگ آواز آزاد آهن آشپز آفتاب آمار آسایش آشکار `,
);

const alefMaddaMore = group('خانه', 'basic', ` آینه آسانسور آباژور آفتابه `);

const alefMaddaFood = group('خوراکی', 'basic', ` آبگوشت آبدوغ آلبالو آبلیمو `);

const expansion01 = group(
  'طبیعت',
  'basic',
  `بذر خرمن کشتزار قنات چاه آتشفشان ماسه غار معدن خاکستر`,
);
const expansion02 = group(
  'حیوانات',
  'basic',
  `سنجاقک حلزون توله مرغابی قوچ میش شترمرغ کرگدن مرجان`,
);
const expansion03 = group(
  'بدن',
  'basic',
  `سیبیل ریش پلک لثه نبض نفس اشک عرق دنده جمجمه`,
);
const expansion04 = group(
  'خانه',
  'basic',
  `حوض پنکه قالی زباله کوزه قندان آویز دریچه اره مسواک شامپو قابلمه چاقو حوضچه`,
);
const expansion05 = group(
  'خوراکی',
  'basic',
  `سوسیس کالباس پیتزا ساندویچ ماکارونی سبزی ریحان نعنا شوید جعفری تربچه قارچ ذرت فندق برشتوک`,
);
const expansion06 = group(
  'شهر',
  'basic',
  `فلکه بوستان کیوسک کلانتری`,
);
const expansion07 = group(
  'مدرسه',
  'basic',
  `اطلس پاسخ پرسش اردو مداد خودکار`,
);
const expansion08 = group(
  'شغل',
  'basic',
  `زرگر قناد گوینده کارگردان کتابدار چوپان`,
);
const expansion09 = group(
  'فناوری',
  'basic',
  `فلش آنتن سیگنال چاپگر بلندگو گذرواژه`,
);
const expansion10 = group(
  'پوشاک',
  'basic',
  `پوتین جیب دمپایی`,
);
const expansion11 = group(
  'سفر',
  'basic',
  `کوله ماجرا گردش بازدید کرایه تور`,
);
const expansion12 = group(
  'اشیا',
  'basic',
  `فرفره بطری بیل`,
);
const expansion13 = group(
  'مکان',
  'basic',
  `حمام استخر`,
);
const expansion14 = group(
  'افعال',
  'basic',
  `بیدار ترسید گریست وزید رویید دمید`,
);
const expansion15 = group(
  'صفت‌ها',
  'basic',
  `گشاد کلفت نازک ژرف خیس زود دیر دور نزدیک صاف گرد زیرک تنبل چالاک سالم مریض آماده مشغول دلگیر نگران آسوده`,
);
const expansion16 = group(
  'زمان',
  'basic',
  `سپیده گذشته آینده اکنون نوبت مهلت فرصت آغاز پایان`,
);
const expansion17 = group(
  'عمومی',
  'basic',
  `شکل عطر طعم مزه لمس فکر قدم حرکت لبخند هنر`,
);
const expansion19 = group(
  'عمومی',
  'basic',
  `کاه زور پول جنگ کاج تاج چاق لاغر تپل خوش ناز دیشب امشب نعناع تاب بابا`,
);

const expansion18 = group(
  'مکان',
  'basic',
  `تیاتر کنسرت کافه`,
);
export const WORDS: readonly WordEntry[] = [
  ...expansion01,
  ...expansion02,
  ...expansion03,
  ...expansion04,
  ...expansion05,
  ...expansion06,
  ...expansion07,
  ...expansion08,
  ...expansion09,
  ...expansion10,
  ...expansion11,
  ...expansion12,
  ...expansion13,
  ...expansion14,
  ...expansion15,
  ...expansion16,
  ...expansion17,
  ...expansion18,
  ...expansion19,
  ...alefMaddaWords,
  ...alefMaddaMore,
  ...alefMaddaFood,
  ...countingMore,
  ...houseMore,
  ...objectBatchThree,
  ...generalMoreThree,
  ...schoolMoreThree,
  ...techMoreThree,
  ...animalMoreThree,
  ...verbMoreThree,
  ...adjectiveMoreThree,
  ...natureMore,
  ...animalsMore,
  ...homeMore,
  ...foodMore,
  ...foodMoreExtended,
  ...clothingMore,
  ...schoolMore,
  ...universityMore,
  ...jobMore,
  ...jobMoreExtended,
  ...techMore,
  ...travelMore,
  ...cityMore,
  ...objectMore,
  ...sportMore,
  ...bodyMore,
  ...bodyMoreExtended,
  ...verbMore,
  ...adjectiveMore,
  ...adjectiveMoreExtended,
  ...timeMoreExtended,
  ...generalMore,
  ...generalMoreExtended,
  ...natureBasic,
  ...natureExtended,
  ...animalsBasic,
  ...animalsExtended,
  ...homeBasic,
  ...homeExtended,
  ...familyBasic,
  ...familyExtended,
  ...foodBasic,
  ...foodExtended,
  ...clothingBasic,
  ...clothingExtended,
  ...schoolBasic,
  ...schoolExtended,
  ...universityBasic,
  ...universityExtended,
  ...jobBasic,
  ...jobExtended,
  ...techBasic,
  ...techExtended,
  ...travelBasic,
  ...travelExtended,
  ...cityBasic,
  ...cityExtended,
  ...placeBasic,
  ...placeExtended,
  ...objectBasic,
  ...objectExtended,
  ...sportBasic,
  ...sportExtended,
  ...bodyBasic,
  ...bodyExtended,
  ...verbBasic,
  ...verbExtended,
  ...adjectiveBasic,
  ...adjectiveExtended,
  ...timeBasic,
  ...timeExtended,
  ...generalBasic,
  ...generalExtended,
];

export type { WordCategory, WordEntry, WordTier };
