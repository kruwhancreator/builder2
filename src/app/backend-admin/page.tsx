'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Save, 
  Lock, 
  Unlock, 
  ArrowLeft,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import initialChapterData from '@/data/sentence-builder-vol-2/chapter-1.json';

export default function BackendAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const [data, setData] = useState<any>(initialChapterData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/save')
      .then(res => res.json())
      .then(fetchedData => {
        if (fetchedData && fetchedData.exercises) {
          setData(fetchedData);
        }
      })
      .catch(err => console.warn('Could not fetch dynamic admin data:', err));
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
            ระบบจัดการเฉลยสำหรับคุณครู / Admin
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
            <Link href="/sentence-builder-vol-2/chapter-1" className="text-xs text-[#2563eb] font-bold hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าแบบฝึกหัด</span>
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold uppercase tracking-wider mb-2">
            ⚙️ Teacher Backend Admin
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
            จัดการเฉลย Unit {data.chapter}: {data.subtitle || 'ฉันกำลัง...'}
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            แก้ไขโจทย์และเฉลยภาษาอังกฤษสำหรับแบบฝึกหัดแต่ละข้อ
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/sentence-builder-vol-2/chapter-1"
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

      {/* ========================================================= */}
      {/* EXERCISE 1 EDITOR */}
      {/* ========================================================= */}
      {ex1 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
          <h2 className="text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
            ✏️ Exercise 1: แปลประโยคภาษาอังกฤษ
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
            🧩 Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค
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
            🖼️ Exercise 3: แต่งจากภาพ
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
