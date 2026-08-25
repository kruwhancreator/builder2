import type { Metadata } from "next";
import "./globals.css";
import { HeaderWrapper, FooterWrapper } from "@/components/NavbarWrapper";

export const metadata: Metadata = {
  title: "ระบบเฉลยและตรวจแบบฝึกหัด | Sentence Builder โดย ครูหวาน",
  description: "ระบบเฉลยและตรวจแบบฝึกหัดภาษาอังกฤษ Sentence Builder โดย ครูหวาน อิงลิช ออน แอร์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@main/fonts/LINESeedSansTH/LINESeedSansTH.css" />
      </head>
      <body className="antialiased selection:bg-[#2563eb] selection:text-white text-[#1e293b] bg-[#f0f7ff]">
        <HeaderWrapper />
        <main>
          {children}
        </main>
        <FooterWrapper />
      </body>
    </html>
  );
}
