import { AppRegistry, I18nManager } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

/**
 * بازی فارسی است. چیدمان داخلی با direction: 'rtl' مستقل از تنظیم سیستم درست
 * نمایش داده می‌شود؛ این تنظیم فقط آینه‌سازی اجزای بومی (دیالوگ‌ها و منوهای
 * سیستم) را فعال می‌کند و در نخستین اجرا پس از نصب، پس از یک بار بستن و باز
 * کردن برنامه اعمال می‌شود.
 */
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

AppRegistry.registerComponent(appName, () => App);
