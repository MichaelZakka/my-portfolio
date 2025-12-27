import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Michael Zakka - IT Engineer",
  description: "Portfolio of Michael Zakka - IT Engineer and Full-Stack Developer specializing in web development, mobile applications, and modern technologies. Explore my projects, skills, and professional experience.",
  keywords: ["Michael Zakka", "IT Engineer", "Full-Stack Developer", "Portfolio", "Web Development", "Flutter Developer", "React Developer"],
  authors: [{ name: "Michael Zakka" }],
  creator: "Michael Zakka",
  icons: {
    icon: '/portfolio-icon.svg',
    shortcut: '/portfolio-icon.svg',
    apple: '/portfolio-icon.svg',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Michael Zakka - IT Engineer & Full-Stack Developer",
    description: "Portfolio of Michael Zakka - IT Engineer and Full-Stack Developer specializing in web development, mobile applications, and modern technologies.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
