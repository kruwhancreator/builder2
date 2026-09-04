import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  GraduationCap
} from 'lucide-react';
import { getBookDataFromDb } from '@/lib/data-manager';
import CurriculumDropdownButton from '@/components/CurriculumDropdownButton';

interface PageProps {
  params: Promise<{
    bookSlug: string;
  }>;
}

export default async function DynamicBookLandingPage({ params }: PageProps) {
  const { bookSlug } = await params;

  // Exclude internal routes
  if (bookSlug === 'backend-admin' || bookSlug === 'api') {
    notFound();
  }

  const bookData = await getBookDataFromDb(bookSlug);

  if (!bookData || (!bookData.title && !bookData.id)) {
    notFound();
  }

  const unitsList = bookData.units || [];

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-4 py-5 sm:py-8">
      {/* Book Banner Header */}
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 mb-6 sm:mb-8 shadow-md relative overflow-hidden">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-xs text-sky-200 text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-3 border border-white/20">
          <span>📖</span>
          <span>{bookData.title || 'Sentence Builder Vol. 2'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold font-heading mb-2.5 leading-tight">
          สารบัญแบบฝึกหัด {unitsList.length > 0 ? `(Unit 1 - ${unitsList.length})` : ''}
        </h1>
        <p className="text-sm sm:text-base md:text-lg opacity-90 max-w-2xl leading-relaxed">
          {bookData.subtitle || 'เฉลยและตรวจทานแบบฝึกหัดแต่งประโยคภาษาอังกฤษ พัฒนาทักษะไวยากรณ์ด้วยระบบตรวจอัตโนมัติ 100%'}
        </p>

        <div className="mt-5 sm:mt-7 pt-4 sm:pt-5 border-t border-white/20 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm md:text-base font-semibold">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-sky-300" />
            <span>รวมทั้งหมด {unitsList.length} บทเรียน</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            <span>ตรวจไวยากรณ์อัตโนมัติ 24 ชม.</span>
          </div>
        </div>
      </div>

      {/* Unit Selection Grid Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-lg sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563eb]" />
          <span>เลือก Unit ที่ต้องการทำ</span>
        </h2>
        <CurriculumDropdownButton bookSlug={bookSlug} units={unitsList} />
      </div>

      {unitsList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {unitsList.map((u: any) => (
            <Link
              key={u.unit_number}
              href={`/${bookSlug}/chapter-${u.unit_number}`}
              prefetch={true}
              className="group bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 hover:border-[#2563eb] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center font-extrabold text-sm sm:text-base font-heading group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                    {u.unit_number}
                  </span>
                  <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100">
                    {u.exerciseCount || 0} Exercises
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors mb-1.5 font-heading">
                  Unit {u.unit_number}: {u.title}
                </h3>
                {u.subtitle && (
                  <p className="text-xs sm:text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">
                    {u.subtitle}
                  </p>
                )}
              </div>

              <div className="mt-4 sm:mt-5 pt-3 sm:pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-[#2563eb] group-hover:translate-x-1 transition-transform">
                <span>เริ่มทำ Unit {u.unit_number}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
          <p className="text-slate-500 font-medium">ยังไม่มี Unit ในหนังสือเล่มนี้</p>
        </div>
      )}
    </div>
  );
}
