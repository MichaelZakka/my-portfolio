import type { Metadata } from 'next';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { getMessages } from 'next-intl/server';
import HtmlDocument from '../components/HtmlDocument';
import { dirFor } from '../../i18n/routing';
import { getPortalTimeZone } from '../lib/portal/format';
import { getPortalLocale, getPortalTranslations } from '../lib/portal/locale';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/** The portal is outside app/[locale]: its language comes from the portal cookie (see lib/portal/locale.ts). */
export default async function PortalRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getPortalLocale();
  const messages = await getMessages({ locale });

  return (
    <HtmlDocument lang={locale} dir={dirFor(locale)} analytics={false}>
      <NextIntlClientProvider
        locale={locale}
        messages={{ portal: messages.portal as AbstractIntlMessages }}
        timeZone={getPortalTimeZone()}
      >
        {children}
      </NextIntlClientProvider>
    </HtmlDocument>
  );
}
