import type { Metadata } from "next";
import { Sarabun, Kanit } from "next/font/google";
import "./globals.css";
import { HeaderWrapper, FooterWrapper } from "@/components/NavbarWrapper";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "เฉลยแบบฝึกหัด Unit 1 | Sentence Builder 2 โดย ครูหวาน",
  description: "ระบบเฉลยและตรวจแบบฝึกหัดภาษาอังกฤษ Sentence Builder 2 โดย ครูหวาน อิงลิช ออน แอร์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${kanit.variable}`}>
      <body className="antialiased selection:bg-[#2563eb] selection:text-white text-[#1e293b] bg-[#f0f7ff] font-sans">
        <HeaderWrapper />
        <main>
          {children}
        </main>
        <FooterWrapper />
      </body>
    </html>
  );
}
