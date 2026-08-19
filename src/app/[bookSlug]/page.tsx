import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpen, 
  Sparkles, 
  QrCode, 
  ArrowRight, 
  GraduationCap
} from 'lucide-react';
import { getBookDataFromDb } from '@/lib/data-manager';

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

  const unitsList = bookData.units && bookData.units.length > 0 
    ? bookData.units 
    : [
        {
          unit_number: 1,
          title: 'Present Continuous & Sentence Expansion',
          subtitle: 'บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]',
          exerciseCount: 3
        }
      ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* QR Banner Notification */}
      <div className="mb-6 bg-[#2563eb]/10 rounded-2xl p-5 flex items-center justify-between gap-4 text-sm sm:text-base text-[#1e3a8a] border border-[#2563eb]/20 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block font-heading text-base sm:text-lg">
              🎉 สแกน QR Code หนังสือ {bookData.title} สำเร็จ!
            </span>
            <p className="text-slate-600 text-sm mt-0.5">
              ยินดีต้อนรับสู่ระบบเฉลยและตรวจแบบฝึกหัด เลือกหัวข้อ Unit ที่ต้องการทำด้านล่างได้เลยครับ
            </p>
          </div>
        </div>
      </div>

      {/* Book Banner Header */}
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white rounded-3xl p-6 sm:p-10 mb-8 shadow-lg relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs sm:text-sm font-bold uppercase tracking-wider mb-4">
          <BookOpen className="w-4 h-4" />
          <span>หนังสือ {bookData.title}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-heading mb-3 leading-tight">
          สารบัญแบบฝึกหัด ({unitsList.length} Units)
        </h1>
        <p className="text-base sm:text-lg opacity-90 max-w-2xl leading-relaxed">
          {bookData.subtitle || 'เฉลยและตรวจทานแบบฝึกหัดแต่งประโยคภาษาอังกฤษ พัฒนาทักษะไวยากรณ์ด้วยระบบตรวจอัตโนมัติ 100%'}
        </p>

        <div className="mt-7 pt-5 border-t border-white/20 flex flex-wrap items-center gap-6 text-sm sm:text-base font-semibold">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-300" />
            <span>รวมทั้งหมด {unitsList.length} บทเรียน</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>ตรวจไวยากรณ์อัตโนมัติ 24 ชม.</span>
          </div>
        </div>
      </div>

      {/* Unit Selection Grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-[#2563eb]" />
          <span>เลือก Unit ที่ต้องการทำ</span>
        </h2>
        <span className="text-sm font-semibold text-slate-600 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs">
          {unitsList.length} Units Available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {unitsList.map((u: any) => (
          <Link
            key={u.unit_number}
            href={`/${bookSlug}/chapter-${u.unit_number}`}
            className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#2563eb] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center font-extrabold text-base font-heading group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                  {u.unit_number}
                </span>
                <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100">
                  {u.exercises?.[0]?.count || 3} Exercises
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors mb-1.5 font-heading">
                Unit {u.unit_number}: {u.title}
              </h3>
              <p className="text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">
                {u.subtitle}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-[#2563eb] group-hover:translate-x-1 transition-transform">
              <span>เริ่มทำ Unit {u.unit_number}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
