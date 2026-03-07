import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // For now, default to Korean. Will be dynamic when i18n routing is added.
  const locale = 'ko';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
