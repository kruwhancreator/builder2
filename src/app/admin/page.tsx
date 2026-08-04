'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Save, 
  Lock, 
  Unlock, 
  Check, 
  Plus, 
  Trash2, 
  BookOpen, 
  FormInput, 
  Image as ImageIcon, 
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import initialChapterData from '@/data/sentence-builder-vol-2/chapter-1.json';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const [data, setData] = useState<any>(initialChapterData);
  const [activeTab, setActiveTab] = useState<'ex-1' | 'ex-2' | 'ex-3'>('ex-1');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newVariation, setNewVariation] = useState<Record<number, string>>({});
  const [newKeyword, setNewKeyword] = useState<Record<number, string>>({});

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
        setSaveMessage({ type: 'success', text: '🎉 บันทึกเฉลยและคำแนะนำ AI สำหรับทุกข้อเรียบร้อยแล้ว!' });
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

  const addVariation = (exId: string, itemIdx: number) => {
    const text = (newVariation[itemIdx] || '').trim();
    if (!text) return;

    setData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const item = copy.exercises[exId].items[itemIdx];
      if (!item.acceptable_answers) item.acceptable_answers = [];
      item.acceptable_answers.push(text);
      return copy;
    });

    setNewVariation(prev => ({ ...prev, [itemIdx]: '' }));
  };

  const removeVariation = (exId: string, itemIdx: number, varIdx: number) => {
    setData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const item = copy.exercises[exId].items[itemIdx];
      if (item.acceptable_answers) {
        item.acceptable_answers.splice(varIdx, 1);
      }
      return copy;
    });
  };

  const addKeyword = (exId: string, itemIdx: number) => {
    const text = (newKeyword[itemIdx] || '').trim();
    if (!text) return;

    setData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const item = copy.exercises[exId].items[itemIdx];
      if (!item.keywords) item.keywords = [];
      item.keywords.push(text);
      return copy;
    });

    setNewKeyword(prev => ({ ...prev, [itemIdx]: '' }));
  };

  const removeKeyword = (exId: string, itemIdx: number, kwIdx: number) => {
    setData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const item = copy.exercises[exId].items[itemIdx];
      if (item.keywords) {
        item.keywords.splice(kwIdx, 1);
      }
      return copy;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 pt-16 pb-20">
        <div className="glass-panel rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1374bc]/10 text-[#1374bc] flex items-center justify-center mx-auto mb-4 border border-[#1374bc]/20">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
            Admin CMS Login
          </h1>
          <p className="text-slate-500 text-xs mb-6">
            ระบบจัดการเฉลยและคำแนะนำ AI สำหรับคุณครู / Admin
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="กรอก Admin Passcode (รหัสผ่านเริ่มต้น: admin123)"
                className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1374bc] focus:ring-2 focus:ring-[#1374bc]/20 shadow-2xs text-center font-mono"
              />
            </div>

            {authError && (
              <p className="text-xs text-[#de3030] font-semibold">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full gradient-button py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>เข้าสู่ระบบ Admin</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <Link href="/sentence-builder-vol-2/chapter-1" className="text-xs text-[#1374bc] font-bold hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าแบบฝึกหัด</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentEx = data.exercises[activeTab];
  const items = currentEx?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1374bc]/10 text-[#1374bc] text-xs font-bold uppercase tracking-wider mb-2">
            ⚙️ Teacher & Admin CMS
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            จัดการเฉลย & คำแนะนำ AI (Answer Context)
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            ใส่เฉลยเป้าหมาย (Model Answer) และคำแนะนำ (Teacher Guidance) เพื่อฝึก AI ในการตรวจข้อสอบ
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
            className="gradient-button px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการเปลี่ยนแปลงทั้งหมด</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
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

      {/* Exercise Selection Tabs */}
      <div className="bg-white rounded-xl p-1.5 mb-6 flex flex-wrap sm:flex-nowrap gap-1.5 border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveTab('ex-1')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ex-1'
              ? 'bg-[#1374bc] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Ex 1: แปลประโยค ({data.exercises['ex-1']?.items?.length || 0} ข้อ)</span>
        </button>

        <button
          onClick={() => setActiveTab('ex-2')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ex-2'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FormInput className="w-3.5 h-3.5" />
          <span>Ex 2: เติมคำ & Free Style ({data.exercises['ex-2']?.items?.length || 0} ข้อ)</span>
        </button>

        <button
          onClick={() => setActiveTab('ex-3')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ex-3'
              ? 'bg-[#de3030] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Ex 3: แต่งจากภาพ ({data.exercises['ex-3']?.items?.length || 0} ข้อ)</span>
        </button>
      </div>

      {/* Question Items Editor List */}
      <div className="space-y-6">
        {items.map((item: any, idx: number) => (
          <div key={item.id || idx} className="glass-panel rounded-2xl p-6 border border-slate-200 notebook-margin shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#1374bc] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {idx + 1}
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  {activeTab === 'ex-1' ? `โจทย์ภาษาไทย: "${item.thai}"` : (item.prompt || item.image_description)}
                </h2>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Question Thai Prompt or Image Description */}
              {activeTab === 'ex-1' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    📍 โจทย์ภาษาไทย:
                  </label>
                  <input
                    type="text"
                    value={item.thai || ''}
                    onChange={(e) => updateItemField(activeTab, idx, 'thai', e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1374bc]"
                  />
                </div>
              )}

              {activeTab === 'ex-2' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    📍 หัวข้อโจทย์ (Prompt Structure):
                  </label>
                  <input
                    type="text"
                    value={item.prompt || ''}
                    onChange={(e) => updateItemField(activeTab, idx, 'prompt', e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1374bc]"
                  />
                </div>
              )}

              {activeTab === 'ex-3' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      🖼️ คำบรรยายภาพ:
                    </label>
                    <input
                      type="text"
                      value={item.image_description || ''}
                      onChange={(e) => updateItemField(activeTab, idx, 'image_description', e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1374bc]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      💡 คำใบ้บริบท (Context Hint):
                    </label>
                    <input
                      type="text"
                      value={item.context_hint || ''}
                      onChange={(e) => updateItemField(activeTab, idx, 'context_hint', e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1374bc]"
                    />
                  </div>
                </div>
              )}

              {/* Target Model Answer */}
              <div className="bg-[#1374bc]/5 rounded-xl p-4 border border-[#1374bc]/20">
                <label className="block font-extrabold text-[#1374bc] uppercase mb-1">
                  🎯 เฉลยเป้าหมายหลัก (Model Answer / Ground Truth):
                </label>
                <input
                  type="text"
                  value={item.model_answer || ''}
                  onChange={(e) => updateItemField(activeTab, idx, 'model_answer', e.target.value)}
                  placeholder="เช่น I am commuting to get home."
                  className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#1374bc] shadow-2xs"
                />
              </div>

              {/* Acceptable Answer Variations */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  ✅ รูปแบบคำตอบอื่นที่ยอมรับเพิ่มเติม (Acceptable Variations):
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {item.acceptable_answers?.map((variation: string, vIdx: number) => (
                    <span
                      key={vIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-medium"
                    >
                      <span>{variation}</span>
                      <button
                        type="button"
                        onClick={() => removeVariation(activeTab, idx, vIdx)}
                        className="text-emerald-600 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVariation[idx] || ''}
                    onChange={(e) => setNewVariation(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="พิมพ์ประโยคตัวเลือกอื่นแล้วกด เพิ่ม..."
                    className="flex-1 rounded-xl bg-white border border-slate-300 px-3.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#1374bc]"
                  />
                  <button
                    type="button"
                    onClick={() => addVariation(activeTab, idx)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มเฉลยย่อย</span>
                  </button>
                </div>
              </div>

              {/* Teacher Guidance / Grading Instructions */}
              <div>
                <label className="block font-bold text-purple-700 uppercase mb-1">
                  💡 คำแนะนำในการตรวจและให้คะแนนสำหรับ Gemini AI (Teacher Guidance Notes):
                </label>
                <textarea
                  rows={2}
                  value={item.teacher_guidance || ''}
                  onChange={(e) => updateItemField(activeTab, idx, 'teacher_guidance', e.target.value)}
                  placeholder="คำสั่งพิเศษถึง AI เช่น เน้นตรวจ Present Continuous, ตรวจการสะกดคำ makeing -> making..."
                  className="w-full rounded-xl bg-purple-50/50 border border-purple-200 px-3.5 py-2 text-xs text-purple-950 font-medium focus:outline-none focus:border-purple-500 shadow-2xs"
                />
              </div>

              {/* Keywords list */}
              {item.keywords && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    🏷️ คำศัพท์บังคับ/คำแนะนำ (Keywords):
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.keywords.map((kw: string, kwIdx: number) => (
                      <span
                        key={kwIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-xs"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => removeKeyword(activeTab, idx, kwIdx)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword[idx] || ''}
                      onChange={(e) => setNewKeyword(prev => ({ ...prev, [idx]: e.target.value }))}
                      placeholder="เพิ่ม Keyword..."
                      className="flex-1 rounded-xl bg-white border border-slate-300 px-3 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#1374bc]"
                    />
                    <button
                      type="button"
                      onClick={() => addKeyword(activeTab, idx)}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่ม Keyword</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Save Button */}
      <div className="sticky bottom-6 mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="gradient-button px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 border border-white/20"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>💾 บันทึกการเปลี่ยนแปลงทั้งหมดเข้าสู่ระบบ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
