import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { createServices, type AppServices, type ServicesOverrides } from '../services';

const ServicesContext = createContext<AppServices | null>(null);

export interface ServicesProviderProps {
  children: React.ReactNode;
  /** فقط برای تست‌ها: تزریق نسخه‌های ساده سرویس‌ها */
  overrides?: ServicesOverrides;
  services?: AppServices;
}

export function ServicesProvider({ children, overrides, services }: ServicesProviderProps) {
  const value = useMemo(() => services ?? createServices(overrides), [services, overrides]);

  useEffect(() => {
    value.clock.load().catch(() => undefined);
    value.analytics.initialize().catch(() => undefined);
    value.ads.initialize().catch(() => undefined);
    value.purchase.initialize().catch(() => undefined);
    if (value.sound.isEnabled()) {
      value.sound.preload().catch(() => undefined);
    }
    return () => {
      value.sound.release();
    };
  }, [value]);

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices باید داخل ServicesProvider استفاده شود.');
  }
  return services;
}

/** نسخه‌ای که در نبود Provider، سرویس‌های پیش‌فرض می‌سازد (برای کامپوننت‌های مستقل) */
export function useOptionalServices(): AppServices {
  const services = useContext(ServicesContext);
  const [fallback] = useState(() => services ?? createServices());
  return services ?? fallback;
}
