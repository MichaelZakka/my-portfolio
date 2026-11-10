import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import HtmlDocument from '../components/HtmlDocument';
import IntroScreen from '../components/IntroScreen';
import { routing, dirFor } from '../../i18n/routing';
import { buildPageMetadata } from '../lib/seo';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Not false: saving content in /admin/content revalidates every page, and on Next 16.1.1 a
// revalidated page under dynamicParams = false fails with NoFallbackError (404/500) instead
// of rebuilding. Unknown locales still 404 through the hasLocale check below.
export const dynamicParams = true;

/** Only these namespaces are used by client components; the rest stays on the server. */
const CLIENT_NAMESPACES = ['common', 'nav', 'meta', 'hero', 'projects', 'contact'] as const;

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    ...buildPageMetadata({ locale, title: t('title'), description: t('description'), absoluteTitle: true }),
    title: { default: t('title'), template: `%s | ${locale === 'ar' ? 'ميشيل زكا' : 'Michael Zakka'}` },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });
  const messages = await getMessages({ locale });
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));

  return (
    <HtmlDocument lang={locale} dir={dirFor(locale)}>
      <IntroScreen locale={locale} dir={dirFor(locale)} />
      <a href="#main" className="skip-link">
        {t('skipToContent')}
      </a>
      <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
    </HtmlDocument>
  );
}
