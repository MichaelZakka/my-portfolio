import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { getStoredContent } from '../app/lib/content/store';
import { applyTextOverrides } from '../app/lib/content/text';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  // Text edited in /admin/content replaces the file's text, key by key
  const { text } = await getStoredContent();
  return {
    locale,
    messages: applyTextOverrides(messages, text[locale === 'ar' ? 'ar' : 'en']),
  };
});
