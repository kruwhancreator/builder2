import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Sparkles, Image as ImageIcon, FormInput, ArrowRight, QrCode } from 'lucide-react';
import chapter1Data from '@/data/sentence-builder-vol-2/chapter-1.json';

interface PageProps {
  params: Promise<{
    chapter: string;
  }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { chapter } = await params;

  // Currently supporting chapter-1
  if (chapter !== 'chapter-1') {
    notFound();
  }

  const data = chapter1Data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* QR Banner Notification */}
      <div className="mb-6 glass-panel-accent rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-indigo-200 border border-indigo-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white">QR Code Scan Successful!</span>
            <p className="text-slate-300">ยินดีต้อนรับสู่แบบฝึกหัดประจำ Chapter {data.chapter} เลือกหัวข้อแบบฝึกหัดด้านล่างได้เลยครับ</p>
          </div>
        </div>
      </div>

      {/* Chapter Title & Header Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 border border-slate-700/60 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-6 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Book: {data.book} • Chapter {data.chapter}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {data.title}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{data.subtitle}</p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-xs text-slate-400 block mb-1">รวมทั้งหมด</span>
            <span className="text-lg font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
              3 Exercises
            </span>
          </div>
        </div>

        {/* Exercises Selection Grid */}
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>เลือกแบบฝึกหัดที่ต้องการทำ</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ex 1 Card */}
          <Link
            href={`/sentence-builder-vol-2/${chapter}/ex-1`}
            className="group glass-panel rounded-xl p-5 border border-slate-700/70 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
                  4 ข้อ
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors mb-1">
                Exercise 1
              </h3>
              <p className="text-xs font-semibold text-indigo-400 mb-2">แปลประโยคภาษาอังกฤษ</p>
              <p className="text-slate-400 text-xs line-clamp-2">
                {data.exercises['ex-1'].instruction}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-medium text-indigo-400 group-hover:translate-x-0.5 transition-transform">
              <span>ทำแบบฝึกหัด Ex 1</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Ex 2 Card */}
          <Link
            href={`/sentence-builder-vol-2/${chapter}/ex-2`}
            className="group glass-panel rounded-xl p-5 border border-slate-700/70 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <FormInput className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                  Word Bank
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors mb-1">
                Exercise 2
              </h3>
              <p className="text-xs font-semibold text-purple-400 mb-2">เติมคำ & แต่งประโยค</p>
              <p className="text-slate-400 text-xs line-clamp-2">
                {data.exercises['ex-2'].instruction}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-medium text-purple-400 group-hover:translate-x-0.5 transition-transform">
              <span>ทำแบบฝึกหัด Ex 2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Ex 3 Card */}
          <Link
            href={`/sentence-builder-vol-2/${chapter}/ex-3`}
            className="group glass-panel rounded-xl p-5 border border-slate-700/70 hover:border-pink-500/50 hover:bg-slate-800/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-pink-500/10 text-pink-300">
                  3 โครงสร้าง
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors mb-1">
                Exercise 3
              </h3>
              <p className="text-xs font-semibold text-pink-400 mb-2">แต่งประโยคจากภาพ</p>
              <p className="text-slate-400 text-xs line-clamp-2">
                {data.exercises['ex-3'].instruction}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-medium text-pink-400 group-hover:translate-x-0.5 transition-transform">
              <span>ทำแบบฝึกหัด Ex 3</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
