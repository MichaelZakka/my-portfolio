import type { PortalLocale } from './constants';
import type { ProposalPhase } from './validation';

/**
 * Starting content for a new proposal, in the language it will be written in.
 * This is editable copy for the admin (not UI strings), so it lives here
 * rather than in messages/*.json. Phases follow the brief's first project type.
 */

type Phase = Omit<ProposalPhase, 'description'> & { description: string };

const PHASES: Record<PortalLocale, Record<string, Phase[]>> = {
  en: {
    landing: [
      { title: 'Discovery and content plan', durationDays: 3, description: 'Goals, audience, page structure and the content each section needs.' },
      { title: 'Design', durationDays: 5, description: 'Desktop and mobile designs for the page, in English and Arabic.' },
      { title: 'Build', durationDays: 5, description: 'Responsive build with full right-to-left Arabic support, contact forms and analytics.' },
      { title: 'Review and launch', durationDays: 3, description: 'Testing on real devices, your final review, and going live on your domain.' },
    ],
    web: [
      { title: 'Discovery', durationDays: 5, description: 'Goals, sitemap, features and content plan.' },
      { title: 'Design', durationDays: 10, description: 'Key page designs for desktop and mobile, in both languages.' },
      { title: 'Development', durationDays: 20, description: 'Building every page and feature, with right-to-left Arabic support.' },
      { title: 'Content and testing', durationDays: 5, description: 'Adding your content, then testing on browsers and devices.' },
      { title: 'Launch', durationDays: 3, description: 'Going live on your domain, plus a short handover walkthrough.' },
    ],
    shopify: [
      { title: 'Discovery', durationDays: 3, description: 'Store goals, catalogue structure, payments and shipping.' },
      { title: 'Store design', durationDays: 7, description: 'Homepage, collection and product page designs, in both languages.' },
      { title: 'Theme development', durationDays: 14, description: 'Building the theme with right-to-left Arabic support.' },
      { title: 'Products and payments', durationDays: 5, description: 'Product import, payment, shipping and tax settings.' },
      { title: 'Testing and launch', durationDays: 3, description: 'Test orders, your final review and opening the store.' },
    ],
    mobile: [
      { title: 'Discovery', durationDays: 5, description: 'Goals, user flows and the feature list.' },
      { title: 'UX and UI design', durationDays: 14, description: 'Screen designs for iOS and Android, in both languages.' },
      { title: 'Development', durationDays: 30, description: 'Building the app with right-to-left Arabic support.' },
      { title: 'Testing and store release', durationDays: 7, description: 'Testing on devices and publishing to the App Store and Google Play.' },
    ],
    other: [
      { title: 'Discovery', durationDays: 5, description: 'Goals, requirements and the work plan.' },
      { title: 'Design', durationDays: 7, description: 'Key designs for desktop and mobile.' },
      { title: 'Development', durationDays: 14, description: 'Building the project with right-to-left Arabic support.' },
      { title: 'Review and launch', durationDays: 3, description: 'Your final review, then going live.' },
    ],
  },
  ar: {
    landing: [
      { title: 'الاستكشاف وخطة المحتوى', durationDays: 3, description: 'الأهداف والجمهور وهيكل الصفحة والمحتوى المطلوب لكل قسم.' },
      { title: 'التصميم', durationDays: 5, description: 'تصاميم الصفحة لسطح المكتب والجوال باللغتين العربية والإنجليزية.' },
      { title: 'التطوير', durationDays: 5, description: 'بناء متجاوب مع دعم كامل للعربية من اليمين إلى اليسار، ونماذج التواصل والتحليلات.' },
      { title: 'المراجعة والإطلاق', durationDays: 3, description: 'الاختبار على أجهزة حقيقية ومراجعتك النهائية ثم الإطلاق على نطاقك.' },
    ],
    web: [
      { title: 'الاستكشاف', durationDays: 5, description: 'الأهداف وخريطة الموقع والميزات وخطة المحتوى.' },
      { title: 'التصميم', durationDays: 10, description: 'تصاميم الصفحات الرئيسية لسطح المكتب والجوال باللغتين.' },
      { title: 'التطوير', durationDays: 20, description: 'بناء جميع الصفحات والميزات مع دعم العربية من اليمين إلى اليسار.' },
      { title: 'المحتوى والاختبار', durationDays: 5, description: 'إضافة محتواك ثم الاختبار على المتصفحات والأجهزة المختلفة.' },
      { title: 'الإطلاق', durationDays: 3, description: 'الإطلاق على نطاقك مع جلسة تسليم قصيرة.' },
    ],
    shopify: [
      { title: 'الاستكشاف', durationDays: 3, description: 'أهداف المتجر وهيكل الكتالوج والدفع والشحن.' },
      { title: 'تصميم المتجر', durationDays: 7, description: 'تصاميم الصفحة الرئيسية وصفحات المجموعات والمنتجات باللغتين.' },
      { title: 'تطوير القالب', durationDays: 14, description: 'بناء القالب مع دعم العربية من اليمين إلى اليسار.' },
      { title: 'المنتجات والدفع', durationDays: 5, description: 'استيراد المنتجات وإعدادات الدفع والشحن والضرائب.' },
      { title: 'الاختبار والإطلاق', durationDays: 3, description: 'طلبات تجريبية ومراجعتك النهائية ثم افتتاح المتجر.' },
    ],
    mobile: [
      { title: 'الاستكشاف', durationDays: 5, description: 'الأهداف ومسارات المستخدم وقائمة الميزات.' },
      { title: 'تصميم تجربة المستخدم والواجهات', durationDays: 14, description: 'تصاميم الشاشات لنظامي iOS وAndroid باللغتين.' },
      { title: 'التطوير', durationDays: 30, description: 'بناء التطبيق مع دعم العربية من اليمين إلى اليسار.' },
      { title: 'الاختبار والنشر', durationDays: 7, description: 'الاختبار على الأجهزة والنشر على App Store وGoogle Play.' },
    ],
    other: [
      { title: 'الاستكشاف', durationDays: 5, description: 'الأهداف والمتطلبات وخطة العمل.' },
      { title: 'التصميم', durationDays: 7, description: 'التصاميم الرئيسية لسطح المكتب والجوال.' },
      { title: 'التطوير', durationDays: 14, description: 'بناء المشروع مع دعم العربية من اليمين إلى اليسار.' },
      { title: 'المراجعة والإطلاق', durationDays: 3, description: 'مراجعتك النهائية ثم الإطلاق.' },
    ],
  },
};

const COPY = {
  en: {
    included: [
      'Responsive design for mobile, tablet and desktop',
      'English and Arabic versions, with a native right-to-left layout',
      'A handover walkthrough after launch',
    ],
    seo: 'Basic SEO setup (page titles, descriptions and sitemap)',
    excluded: [
      'Domain, hosting and third-party subscription fees',
      'Writing and translating your content',
      'Ongoing maintenance after launch (available separately)',
    ],
    content: 'Final text and images for each page, in both languages',
    logo: 'Your logo and brand files',
    access: 'Access to your domain and hosting accounts',
    paymentTerms: '50% upfront to start the work, 50% before launch.',
  },
  ar: {
    included: [
      'تصميم متجاوب للجوال والأجهزة اللوحية وسطح المكتب',
      'نسختان عربية وإنجليزية بتخطيط أصيل من اليمين إلى اليسار',
      'جلسة تسليم وشرح بعد الإطلاق',
    ],
    seo: 'إعداد أساسي لتحسين الظهور في محركات البحث (عناوين الصفحات والأوصاف وخريطة الموقع)',
    excluded: [
      'رسوم النطاق والاستضافة والاشتراكات الخارجية',
      'كتابة المحتوى وترجمته',
      'الصيانة المستمرة بعد الإطلاق (متاحة بشكل منفصل)',
    ],
    content: 'النصوص والصور النهائية لكل صفحة باللغتين',
    logo: 'شعارك وملفات هويتك البصرية',
    access: 'صلاحية الوصول إلى حسابات النطاق والاستضافة',
    paymentTerms: '50% دفعة مقدّمة لبدء العمل، و50% قبل الإطلاق.',
  },
} as const;

export function proposalDefaults(input: { locale: PortalLocale; projectTypes: string[]; hasBrand: string }) {
  const { locale } = input;
  const type = input.projectTypes.find((t) => t in PHASES[locale] && t !== 'other') ?? 'other';
  const copy = COPY[locale];
  return {
    phases: PHASES[locale][type].map((phase) => ({ ...phase })),
    included: [...copy.included, ...(type === 'mobile' ? [] : [copy.seo])],
    excluded: [...copy.excluded],
    clientProvides: [copy.content, ...(input.hasBrand === 'Yes' ? [copy.logo] : []), copy.access],
    paymentTerms: copy.paymentTerms,
  };
}
