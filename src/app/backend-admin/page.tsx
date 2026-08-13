'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Save, 
  Lock, 
  Unlock, 
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  BarChart3,
  QrCode,
  GraduationCap,
  TrendingUp,
  Users
} from 'lucide-react';
import initialChapterData from '@/data/sentence-builder-vol-2/chapter-1.json';

export default function BackendAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [data, setData] = useState<any>(initialChapterData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Analytics Metrics State
  const [analytics, setAnalytics] = useState<{
    totalQrScans: number;
    unit1Views: number;
    unit30Views: number;
    qrToUnit1Conversion: number;
    courseCompletionRate: number;
    unitViews: Array<{ unit_number: number; view_count: number }>;
  } | null>(null);

  useEffect(() => {
    // Fetch Exercise Content Data
    fetch('/api/admin/save')
      .then(res => res.json())
      .then(fetchedData => {
        if (fetchedData && fetchedData.exercises) {
          setData(fetchedData);
        }
      })
      .catch(err => console.warn('Could not fetch dynamic admin data:', err));

    // Fetch Analytics Metrics Summary
    fetch('/api/analytics/summary?book=sentence-builder-vol-2')
      .then(res => res.json())
      .then(analyticsData => {
        if (analyticsData && !analyticsData.error) {
          setAnalytics(analyticsData);
        }
      })
      .catch(err => console.warn('Could not fetch analytics data:', err));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Passcode ไม่ถูกต้อง (รหัสผ่านเริ่มต้น: admin123)');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterData: data,
          passcode: passcode || 'admin123'
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: '🎉 บันทึกเฉลยเรียบร้อยแล้ว!' });
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการบันทึก' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateItemField = (exId: string, itemIdx: number, field: string, value: any) => {
    setData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (copy.exercises[exId] && copy.exercises[exId].items[itemIdx]) {
        copy.exercises[exId].items[itemIdx][field] = value;
      }
      return copy;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 pt-16 pb-20">
        <div className="glass-panel rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center mx-auto mb-4 border border-[#1e3a8a]/20">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1 font-heading">
            Backend Admin Login
          </h1>
          <p className="text-slate-500 text-xs mb-6">
            ระบบจัดการเฉลย & Analytics สำหรับคุณครู / Admin
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="กรอก Backend Admin Passcode ( admin123 )"
                className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-center font-mono"
              />
            </div>

            {authError && (
              <p className="text-xs text-[#dc2626] font-semibold">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>เข้าสู่ระบบ Backend Admin</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <Link href="/sentence-builder-vol-2" className="text-xs text-[#2563eb] font-bold hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าหลักหนังสือ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ex1 = data.exercises['ex-1'];
  const ex2 = data.exercises['ex-2'];
  const ex3 = data.exercises['ex-3'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold uppercase tracking-wider mb-2">
            ⚙️ Teacher Backend Admin CMS & Analytics
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
            ระบบจัดการเฉลย & ติดตามสถิติผู้ใช้งาน
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            หนังสือ Sentence Builder Vol. 2 (Units 1 - 30)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/sentence-builder-vol-2"
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ดูหน้าแบบฝึกหัด</span>
          </Link>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 📊 ANALYTICS DASHBOARD CARD */}
      {/* ========================================================= */}
      {analytics && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-lg font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2563eb]" />
              <span>สถิติการสแกน QR Code & อัตราเรียนจบ (Course Completion Funnel)</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb]">
              Book: Sentence Builder Vol. 2
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Metric 1: Total QR Scans */}
            <div className="bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">ยอดสแกน QR Code ทั้งหมด</span>
                <QrCode className="w-4 h-4 text-[#2563eb]" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-heading">
                {analytics.totalQrScans.toLocaleString()} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">ผู้เรียนที่สแกนเข้าสู่หน้าหลัก</p>
            </div>

            {/* Metric 2: Unit 1 Starts */}
            <div className="bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">ผู้เรียนที่เริ่มทำ Unit 1</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-heading">
                {analytics.unit1Views.toLocaleString()} <span className="text-xs font-normal text-slate-500">คน</span>
              </div>
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                Conversion: {analytics.qrToUnit1Conversion}% จากคนสแกน
              </p>
            </div>

            {/* Metric 3: Unit 30 Finishers */}
            <div className="bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">ผู้เรียนที่เรียนถึง Unit 30</span>
                <GraduationCap className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-heading">
                {analytics.unit30Views.toLocaleString()} <span className="text-xs font-normal text-slate-500">คน</span>
              </div>
              <p className="text-[11px] text-purple-600 mt-1 font-semibold">
                100% Course Finishers
              </p>
            </div>

            {/* Metric 4: Course Completion Rate */}
            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between opacity-90 mb-2">
                <span className="text-xs font-semibold">อัตราการเรียนจบทั้งเล่ม</span>
                <TrendingUp className="w-4 h-4 text-sky-300" />
              </div>
              <div className="text-3xl font-extrabold font-heading">
                {analytics.courseCompletionRate}%
              </div>
              <p className="text-[11px] opacity-80 mt-1">คำนวณจาก (Unit 30 / Unit 1)</p>
            </div>
          </div>

          {/* Unit Completion Progress Bar Grid (Units 1 to 30) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              📊 จำนวนผู้เข้าเรียนจำแนกตาม Unit (Units 1 - 30)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-2">
              {analytics.unitViews.slice(0, 30).map((u) => {
                const maxViews = analytics.unit1Views || 1;
                const percentage = Math.min(100, Math.round((u.view_count / maxViews) * 100));
                return (
                  <div key={u.unit_number} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">Unit {u.unit_number}</span>
                    <span className="text-xs font-extrabold text-slate-900 font-heading block">{u.view_count}</span>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div 
                        className="bg-[#2563eb] h-1.5 rounded-full transition-all" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {saveMessage && (
        <div className={`mb-6 p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveMessage.text}</span>
          </div>
          <button onClick={() => setSaveMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Select Unit Selector */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs mb-6 flex items-center justify-between gap-4">
        <label className="text-xs font-bold text-slate-700 uppercase">
          📌 เลือก Unit ที่ต้องการแก้ไขเฉลย:
        </label>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(Number(e.target.value))}
          className="rounded-xl bg-slate-50 border border-slate-300 px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
        >
          {Array.from({ length: 30 }, (_, idx) => (
            <option key={idx + 1} value={idx + 1}>
              Unit {idx + 1}
            </option>
          ))}
        </select>
      </div>

      {/* ========================================================= */}
      {/* EXERCISE 1 EDITOR */}
      {/* ========================================================= */}
      {ex1 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
          <h2 className="text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
            ✏️ Exercise 1: แปลประโยคภาษาอังกฤษ (Unit {selectedUnit})
          </h2>

          <div className="space-y-6">
            {ex1.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="font-bold text-[#1e3a8a] text-sm mb-3">
                  ข้อ {idx + 1}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      📍 โจทย์ภาษาไทย:
                    </label>
                    <input
                      type="text"
                      value={item.thai || ''}
                      onChange={(e) => updateItemField('ex-1', idx, 'thai', e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#1e3a8a] uppercase mb-1">
                      🎯 เฉลย:
                    </label>
                    <input
                      type="text"
                      value={item.model_answer || ''}
                      onChange={(e) => updateItemField('ex-1', idx, 'model_answer', e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXERCISE 2 EDITOR */}
      {/* ========================================================= */}
      {ex2 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
          <h2 className="text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
            🧩 Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค (Unit {selectedUnit})
          </h2>

          <div className="space-y-6">
            {ex2.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="font-bold text-[#1e3a8a] text-sm mb-3">
                  ข้อ {idx + 1}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      📍 โจทย์ข้อความ:
                    </label>
                    <input
                      type="text"
                      value={item.prompt || ''}
                      onChange={(e) => updateItemField('ex-2', idx, 'prompt', e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#1e3a8a] uppercase mb-1">
                      🎯 เฉลย:
                    </label>
                    <input
                      type="text"
                      value={item.model_answer || ''}
                      onChange={(e) => updateItemField('ex-2', idx, 'model_answer', e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXERCISE 3 EDITOR */}
      {/* ========================================================= */}
      {ex3 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
          <h2 className="text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
            🖼️ Exercise 3: แต่งจากภาพ (Unit {selectedUnit})
          </h2>

          <div className="space-y-6">
            {ex3.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="font-bold text-[#1e3a8a] text-sm mb-3">
                  ภาพที่ {idx + 1}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        🖼️ คำบรรยายภาพ:
                      </label>
                      <input
                        type="text"
                        value={item.image_description || ''}
                        onChange={(e) => updateItemField('ex-3', idx, 'image_description', e.target.value)}
                        className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        💡 คำใบ้บริบทภาพ:
                      </label>
                      <input
                        type="text"
                        value={item.context_hint || ''}
                        onChange={(e) => updateItemField('ex-3', idx, 'context_hint', e.target.value)}
                        className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#1e3a8a] uppercase mb-1">
                      🎯 เฉลย:
                    </label>
                    <input
                      type="text"
                      value={item.model_answer || ''}
                      onChange={(e) => updateItemField('ex-3', idx, 'model_answer', e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Save Button */}
      <div className="sticky bottom-6 mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 border border-white/20 transition-colors cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>💾 บันทึกการเปลี่ยนแปลงทั้งหมด</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
