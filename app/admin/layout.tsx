import HtmlDocument from '../components/HtmlDocument';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HtmlDocument lang="en" dir="ltr">
      {children}
    </HtmlDocument>
  );
}
