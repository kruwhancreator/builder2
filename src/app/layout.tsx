import type { Metadata } from "next";
import { Sarabun, Kanit } from "next/font/google";
import "./globals.css";

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
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/sentence-builder-vol-2/chapter-1" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] flex items-center justify-center font-bold text-white shadow-xs group-hover:scale-105 transition-transform font-heading">
                SB
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#1e3a8a] tracking-wide flex items-center gap-1.5 font-heading">
                  Sentence Builder <span className="text-xs px-2 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#2563eb] font-semibold border border-[#3b82f6]/20">Vol. 2</span>
                </h1>
                <p className="text-[10px] text-slate-500">เฉลยและตรวจแบบฝึกหัด โดย ครูหวาน</p>
              </div>
            </a>
            
            <div className="flex items-center gap-2">
              <a 
                href="/sentence-builder-vol-2/chapter-1"
                className="text-xs px-3.5 py-1.5 rounded-lg bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] font-semibold border border-[#bfdbfe] transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <span>📘 แบบฝึกหัด Unit 1</span>
              </a>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-61px)] pb-12">
          {children}
        </main>

        <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200 bg-white">
          <p>© Sentence Builder 2 โดย ครูหวาน อิงลิช ออน แอร์ • ระบบเฉลยและตรวจแบบฝึกหัด</p>
        </footer>
      </body>
    </html>
  );
}
