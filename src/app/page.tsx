import Link from 'next/link';
import { BookOpen, Sparkles, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-10 pb-16">
      {/* Hero Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1374bc]/10 border border-[#1374bc]/30 text-[#1374bc] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#1374bc] animate-pulse" />
          <span>AI-Powered Sentence Builder Companion</span>
        </div>
      </div>

      {/* Hero Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
          Sentence Builder <span className="gradient-text">Vol. 2</span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          ระบบ AI Exercise Advisor ตรวจทานแบบฝึกหัดภาษาอังกฤษ ให้คำแนะนำเจาะลึกแบบ QuillBot พร้อมแจกแจงโครงสร้างประโยคตามบทเรียน
        </p>
      </div>

      {/* CTA Main Card */}
      <div className="glass-panel-accent rounded-2xl p-6 sm:p-8 mb-10 border border-[#1374bc]/20 relative overflow-hidden notebook-margin">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#de3030] mb-1">
              <span>Chapter 1</span>
              <span>•</span>
              <span>Present Continuous</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Present Continuous & Sentence Expansion
            </h2>
            <p className="text-slate-600 text-sm max-w-xl">
              เริ่มทำแบบฝึกหัด Chapter 1 ครบทั้ง 3 รูปแบบ: แปลประโยค (Ex 1), เติมคำจาก Word Bank (Ex 2), และแต่งประโยคจากภาพ 3 โครงสร้าง (Ex 3)
            </p>
          </div>

          <Link
            href="/sentence-builder-vol-2/chapter-1"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl gradient-button font-bold text-sm flex items-center justify-center gap-2 shadow-md shrink-0"
          >
            <span>เริ่มทำแบบฝึกหัด</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Features Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl p-5 border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-[#1374bc]/10 text-[#1374bc] flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Ex 1: แปลประโยค</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            ตรวจไวยากรณ์ Present Continuous (S + is/am/are + V.ing) ยืดหยุ่นตามความหมาย พร้อมแนะนำคำศัพท์สละสลวย
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Ex 2: เติมคำ Word Bank</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            มี Word Bank ช่วยเลือกคำประกอบประโยค (Action + Time + Purpose + Reason) หรือแต่งคำของตัวเอง
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-[#de3030]/10 text-[#de3030] flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Ex 3: แต่งประโยคจากภาพ</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            ตรวจเช็ก 3 องค์ประกอบหลัก: Core (S+am+V.ing), Context (เวลา/สถานที่) และ Connect (because + reason)
          </p>
        </div>
      </div>
    </div>
  );
}
