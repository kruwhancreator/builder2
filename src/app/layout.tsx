import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Sentence Builder Vol. 2 | AI Exercise Advisor",
  description: "ระบบตรวจทานและแนะนำการแต่งประโยคภาษาอังกฤษ AI Exercise Advisor สำหรับ Sentence Builder Vol. 2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased selection:bg-[#1374bc] selection:text-white text-slate-800">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/sentence-builder-vol-2/chapter-1" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#1374bc] flex items-center justify-center font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
                SB
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-1.5">
                  Sentence Builder <span className="text-xs px-2 py-0.5 rounded-full bg-[#1374bc]/10 text-[#1374bc] font-semibold border border-[#1374bc]/20">Vol. 2</span>
                </h1>
                <p className="text-[10px] text-slate-500">AI Exercise Advisor System</p>
              </div>
            </a>
            
            <div className="flex items-center gap-2">
              <a 
                href="/sentence-builder-vol-2/chapter-1"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-300 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>📘 Exercises</span>
              </a>

              <a 
                href="/admin"
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1374bc]/10 hover:bg-[#1374bc]/20 text-[#1374bc] font-bold border border-[#1374bc]/20 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>⚙️ Admin CMS</span>
              </a>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-61px)] pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
