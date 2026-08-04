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

  if (chapter !== 'chapter-1') {
    notFound();
  }

  const data = chapter1Data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* QR Banner Notification */}
      <div className="mb-6 bg-[#1374bc]/10 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-[#1374bc] border border-[#1374bc]/20 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1374bc] text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">QR Code Scan Successful!</span>
            <p className="text-slate-600">ยินดีต้อนรับสู่แบบฝึกหัดประจำ Chapter {data.chapter} เลือกหัวข้อแบบฝึกหัดด้านล่างได้เลยครับ</p>
          </div>
        </div>
      </div>

      {/* Chapter Title & Header Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 border border-slate-200 notebook-margin">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1374bc]/10 text-[#1374bc] text-xs font-bold uppercase tracking-wider mb-2">
              Book: {data.book} • Chapter {data.chapter}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {data.title}
            </h1>
            <p className="text-slate-600 text-sm mt-1">{data.subtitle}</p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-xs text-slate-500 block mb-1 font-medium">รวมทั้งหมด</span>
            <span className="text-sm font-bold text-[#1374bc] bg-[#1374bc]/10 px-3 py-1 rounded-lg border border-[#1374bc]/20">
              3 Exercises
            </span>
          </div>
        </div>

        {/* Exercises Selection Grid */}
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1374bc]" />
          <span>เลือกแบบฝึกหัดที่ต้องการทำ</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ex 1 Card */}
          <Link
            href={`/sentence-builder-vol-2/${chapter}/ex-1`}
            className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-[#1374bc] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#1374bc]/10 text-[#1374bc] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#1374bc]/10 text-[#1374bc]">
                  4 ข้อ
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1374bc] transition-colors mb-1">
                Exercise 1
              </h3>
              <p className="text-xs font-semibold text-[#1374bc] mb-2">แปลประโยคภาษาอังกฤษ</p>
              <p className="text-slate-600 text-xs line-clamp-2">
                {data.exercises['ex-1'].instruction}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#1374bc] group-hover:translate-x-0.5 transition-transform">
              <span>ทำแบบฝึกหัด Ex 1</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Ex 2 Card */}
          <Link
            href={`/sentence-builder-vol-2/${chapter}/ex-2`}
            className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-[#1374bc] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FormInput className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  Word Bank
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1374bc] transition-colors mb-1">
                Exercise 2
              </h3>
              <p className="text-xs font-semibold text-indigo-600 mb-2">เติมคำ & แต่งประโยค</p>
              <p className="text-slate-600 text-xs line-clamp-2">
                {data.exercises['ex-2'].instruction}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <span>ทำแบบฝึกหัด Ex 2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Ex 3 Card */}
          <Link
            href={`/sentence-builder-vol-2/${chapter}/ex-3`}
            className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-[#de3030] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#de3030]/10 text-[#de3030] flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#de3030]/10 text-[#de3030]">
                  3 โครงสร้าง
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-[#de3030] transition-colors mb-1">
                Exercise 3
              </h3>
              <p className="text-xs font-semibold text-[#de3030] mb-2">แต่งประโยคจากภาพ</p>
              <p className="text-slate-600 text-xs line-clamp-2">
                {data.exercises['ex-3'].instruction}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#de3030] group-hover:translate-x-0.5 transition-transform">
              <span>ทำแบบฝึกหัด Ex 3</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
