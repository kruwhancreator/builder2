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
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/sentence-builder-vol-2/chapter-1" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-105 transition-transform">
                SB
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
                  Sentence Builder <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Vol. 2</span>
                </h1>
                <p className="text-[10px] text-slate-400">AI Exercise Advisor System</p>
              </div>
            </a>
            
            <a 
              href="/sentence-builder-vol-2/chapter-1"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5"
            >
              <span>📘 Chapter 1 Overview</span>
            </a>
          </div>
        </header>

        <main className="min-h-[calc(100vh-61px)] pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
