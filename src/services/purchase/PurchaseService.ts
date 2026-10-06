import { GAME_CONFIG } from '../../constants/gameConfig';

export type ProductId =
  | 'coinsSmall'
  | 'coinsMedium'
  | 'coinsLarge'
  | 'removeAds'
  | 'premium';

export type ProductKind = 'consumable' | 'non_consumable';

export interface PurchaseProduct {
  id: ProductId;
  sku: string;
  title: string;
  description: string;
  kind: ProductKind;
  /** تعداد سکه‌ای که با این محصول اضافه می‌شود */
  coins: number;
}

export type PurchaseStatus = 'success' | 'cancelled' | 'unavailable' | 'failed';

export interface PurchaseResult {
  status: PurchaseStatus;
  productId: ProductId;
  /** توکن خرید؛ برای مصرف‌کردن محصول‌های مصرفی لازم است */
  token?: string;
  error?: string;
}

export interface PurchaseProvider {
  readonly name: string;
  initialize(): Promise<void>;
  isAvailable(): Promise<boolean>;
  getProducts(): Promise<PurchaseProduct[]>;
  purchase(productId: ProductId): Promise<PurchaseResult>;
  consume(token: string): Promise<boolean>;
  restore(): Promise<PurchaseResult[]>;
}

/**
 * فهرست محصول‌ها.
 * شناسه داخلی (id) در کد استفاده می‌شود و SKU همان شناسه‌ای است که در پیشخان
 * بازار ساخته می‌شود؛ بنابراین تغییر SKU نیازی به تغییر کد ندارد.
 */
export const PRODUCTS: readonly PurchaseProduct[] = [
  {
    id: 'coinsSmall',
    sku: GAME_CONFIG.purchase.productIds.coinsSmall,
    title: 'بسته کوچک سکه',
    description: '۱۰۰ سکه برای راهنما و ادامه بازی',
    kind: 'consumable',
    coins: 100,
  },
  {
    id: 'coinsMedium',
    sku: GAME_CONFIG.purchase.productIds.coinsMedium,
    title: 'بسته متوسط سکه',
    description: '۵۵۰ سکه با تخفیف نسبت به بسته کوچک',
    kind: 'consumable',
    coins: 550,
  },
  {
    id: 'coinsLarge',
    sku: GAME_CONFIG.purchase.productIds.coinsLarge,
    title: 'بسته بزرگ سکه',
    description: '۱۵۰۰ سکه با بیشترین صرفه',
    kind: 'consumable',
    coins: 1500,
  },
  {
    id: 'removeAds',
    sku: GAME_CONFIG.purchase.productIds.removeAds,
    title: 'حذف تبلیغات',
    description: 'تجربه بازی بدون تبلیغ میان‌صفحه‌ای',
    kind: 'non_consumable',
    coins: 0,
  },
  {
    id: 'premium',
    sku: GAME_CONFIG.purchase.productIds.premium,
    title: 'نسخه ویژه',
    description: 'قلب نامحدود و دسترسی به همه امکانات ویژه',
    kind: 'non_consumable',
    coins: 0,
  },
];

/** پیاده‌سازی پیش‌فرض: خرید در دسترس نیست. */
export class NoopPurchaseProvider implements PurchaseProvider {
  readonly name = 'noop';

  async initialize(): Promise<void> {}

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getProducts(): Promise<PurchaseProduct[]> {
    return [];
  }

  async purchase(productId: ProductId): Promise<PurchaseResult> {
    return { status: 'unavailable', productId };
  }

  async consume(): Promise<boolean> {
    return false;
  }

  async restore(): Promise<PurchaseResult[]> {
    return [];
  }
}

/**
 * سرویس خرید درون‌برنامه‌ای.
 *
 * در MVP غیرفعال است. برای فعال‌سازی در کافه‌بازار باید از راهکار رسمی بازار
 * (کتابخانه Poolakey) استفاده شود؛ کلید عمومی برنامه از پیشخان گرفته می‌شود و
 * نباید داخل مخزن کد قرار بگیرد (از متغیر محیطی/Build Config خوانده شود).
 */
export class PurchaseService {
  private provider: PurchaseProvider;
  private initialized = false;

  constructor(provider: PurchaseProvider = new NoopPurchaseProvider()) {
    this.provider = provider;
  }

  get providerName(): string {
    return this.provider.name;
  }

  isEnabled(): boolean {
    return GAME_CONFIG.purchase.enabled && this.provider.name !== 'noop';
  }

  async initialize(): Promise<void> {
    if (this.initialized || !this.isEnabled()) {
      return;
    }
    await this.provider.initialize();
    this.initialized = true;
  }

  async getProducts(): Promise<PurchaseProduct[]> {
    if (!this.isEnabled()) {
      return [];
    }
    return this.provider.getProducts();
  }

  async purchase(productId: ProductId): Promise<PurchaseResult> {
    if (!this.isEnabled()) {
      return { status: 'unavailable', productId };
    }
    return this.provider.purchase(productId);
  }

  findProduct(productId: ProductId): PurchaseProduct | undefined {
    return PRODUCTS.find(product => product.id === productId);
  }
}
