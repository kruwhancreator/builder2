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
  Users,
  BookOpen,
  Plus,
  Settings,
  ChevronRight
} from 'lucide-react';
import initialChapterData from '@/data/sentence-builder-vol-2/chapter-1.json';

const INITIAL_BOOKS = [
  { id: 'sentence-builder-vol-1', title: 'Sentence Builder Vol. 1', subtitle: 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ Vol. 1', totalUnits: 30 },
  { id: 'sentence-builder-vol-2', title: 'Sentence Builder Vol. 2', subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2', totalUnits: 30 },
  { id: 'sentence-builder-vol-3', title: 'Sentence Builder Vol. 3', subtitle: 'แบบฝึกหัดแต่งประโยคขั้นสูง Vol. 3', totalUnits: 30 },
];

export default function BackendAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Level 1: Books List, Level 2: Book Content Management
  const [activeView, setActiveView] = useState<'books_list' | 'book_editor'>('books_list');
  const [booksList, setBooksList] = useState(INITIAL_BOOKS);
  const [selectedBook, setSelectedBook] = useState<string>('sentence-builder-vol-2');
  const [selectedUnit, setSelectedUnit] = useState<number>(1);

  // New Book Form State
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookSubtitle, setNewBookSubtitle] = useState('');
  const [showAddBookModal, setShowAddBookModal] = useState(false);

  const [data, setData] = useState<any>(initialChapterData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Analytics Metrics State per selected book
  const [analytics, setAnalytics] = useState<{
    bookName: string;
    totalQrScans: number;
    unit1Views: number;
    unit30Views: number;
    qrToUnit1Conversion: number;
    courseCompletionRate: number;
    unitViews: Array<{ unit_number: number; view_count: number }>;
  } | null>(null);

  // Refetch analytics whenever selectedBook changes
  useEffect(() => {
    fetch(`/api/analytics/summary?book=${selectedBook}`)
      .then(res => res.json())
      .then(analyticsData => {
        if (analyticsData && !analyticsData.error) {
          setAnalytics(analyticsData);
        }
      })
      .catch(err => console.warn('Could not fetch analytics data:', err));
  }, [selectedBook]);

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

  const handleAddNewBook = () => {
    if (!newBookTitle.trim()) return;
    const slug = newBookTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newBookObj = {
      id: slug || `book-${Date.now()}`,
      title: newBookTitle.trim(),
      subtitle: newBookSubtitle.trim() || 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ',
      totalUnits: 30
    };
    setBooksList(prev => [...prev, newBookObj]);
    setSelectedBook(newBookObj.id);
    setNewBookTitle('');
    setNewBookSubtitle('');
    setShowAddBookModal(false);
    setActiveView('book_editor');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterData: { ...data, book: selectedBook },
          passcode: passcode || 'admin123'
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🎉 บันทึกเฉลยสำหรับหนังสือ "${selectedBook}" เรียบร้อยแล้ว!` });
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
            ระบบจัดการหนังสือ เฉลย & Analytics สำหรับคุณครู / Admin
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

  const activeBookObj = booksList.find(b => b.id === selectedBook) || booksList[0];
  const ex1 = data.exercises['ex-1'];
  const ex2 = data.exercises['ex-2'];
  const ex3 = data.exercises['ex-3'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ========================================================= */}
      {/* LEVEL 1: BOOKS LIST DASHBOARD */}
      {/* ========================================================= */}
      {activeView === 'books_list' && (
        <div>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold uppercase tracking-wider mb-2">
                ⚙️ Multi-Book Backend Admin CMS
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
                รายชื่อหนังสือทั้งหมดในระบบ (Books Directory)
              </h1>
              <p className="text-slate-600 text-xs mt-1">
                คลิกเลือกหนังสือเพื่อจัดการเฉลย (CRUD Units / Exercises / Answers) หรือกดเพิ่มหนังสือเล่มใหม่
              </p>
            </div>

            <button
              onClick={() => setShowAddBookModal(true)}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มหนังสือเล่มใหม่</span>
            </button>
          </div>

          {/* Books List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {booksList.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#2563eb] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center font-bold">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100">
                      {book.totalUnits} Units
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 font-heading mb-1">
                    {book.title}
                  </h2>
                  <p className="text-xs text-slate-500 mb-2 font-mono">
                    URL: /{book.id}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {book.subtitle}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/${book.id}`}
                    target="_blank"
                    className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
                  >
                    🔗 ดูหน้าเว็บ
                  </Link>

                  <button
                    onClick={() => {
                      setSelectedBook(book.id);
                      setActiveView('book_editor');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>จัดการเฉลย & สถิติ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LEVEL 2: SELECTED BOOK CONTENT & ANALYTICS EDITOR */}
      {/* ========================================================= */}
      {activeView === 'book_editor' && (
        <div>
          {/* Back to Books Directory Link */}
          <div className="mb-4">
            <button
              onClick={() => setActiveView('books_list')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← กลับสู่รายชื่อหนังสือทั้งหมด (Back to Books List)</span>
            </button>
          </div>

          {/* Header Banner for Selected Book */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold uppercase tracking-wider mb-2">
                📘 หนังสือ: {activeBookObj.title}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
                จัดการเฉลย & ดูสถิติ ({activeBookObj.title})
              </h1>
              <p className="text-slate-600 text-xs mt-1">
                URL: /{activeBookObj.id} • แก้ไขโจทย์และเฉลยภาษาอังกฤษประจำแต่ละ Unit
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/${activeBookObj.id}`}
                target="_blank"
                className="text-xs px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ดูหน้าหนังสือ</span>
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

          {/* 📊 ANALYTICS DASHBOARD CARD */}
          {analytics && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h2 className="text-lg font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#2563eb]" />
                  <span>สถิติผู้ใช้งาน: {activeBookObj.title}</span>
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] font-mono">
                  /{selectedBook}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">ยอดสแกน QR Code</span>
                    <QrCode className="w-4 h-4 text-[#2563eb]" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-heading">
                    {analytics.totalQrScans.toLocaleString()} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">สแกนเข้าหน้ารวมเล่ม</p>
                </div>

                <div className="bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">ผู้เรียนที่เริ่มทำ Unit 1</span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-heading">
                    {analytics.unit1Views.toLocaleString()} <span className="text-xs font-normal text-slate-500">คน</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    Conversion: {analytics.qrToUnit1Conversion}%
                  </p>
                </div>

                <div className="bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">ผู้เรียนที่เรียนถึง Unit 30</span>
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-heading">
                    {analytics.unit30Views.toLocaleString()} <span className="text-xs font-normal text-slate-500">คน</span>
                  </div>
                  <p className="text-[11px] text-purple-600 mt-1 font-semibold">
                    100% Finishers
                  </p>
                </div>

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

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  📊 จำนวนผู้เข้าเรียนจำแนกตาม Unit ของเล่มนี้ (Units 1 - 30)
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
              📌 เลือก Unit ของ {activeBookObj.title} ที่ต้องการแก้ไขเฉลย:
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

          {/* EXERCISE 1 EDITOR */}
          {ex1 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
              <h2 className="text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
                ✏️ Exercise 1: แปลประโยคภาษาอังกฤษ ({activeBookObj.title} • Unit {selectedUnit})
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

          {/* EXERCISE 2 EDITOR */}
          {ex2 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
              <h2 className="text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
                🧩 Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค ({activeBookObj.title} • Unit {selectedUnit})
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

          {/* EXERCISE 3 EDITOR */}
          {ex3 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
              <h2 className="text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
                🖼️ Exercise 3: แต่งจากภาพ ({activeBookObj.title} • Unit {selectedUnit})
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
                  <span>💾 บันทึกการเปลี่ยนแปลง ({activeBookObj.title})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add New Book Modal */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">
              📚 เพิ่มหนังสือเล่มใหม่สู่ระบบ
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              กรอกชื่อหนังสือภาษาอังกฤษหรือภาษาไทย (ระบบจะสร้าง URL Slug อัตโนมัติ)
            </p>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  ชื่อหนังสือ (Title):
                </label>
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  placeholder="เช่น Sentence Builder Vol. 3"
                  className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  คำอธิบายแบบย่อ (Subtitle):
                </label>
                <input
                  type="text"
                  value={newBookSubtitle}
                  onChange={(e) => setNewBookSubtitle(e.target.value)}
                  placeholder="เช่น แบบฝึกหัดแต่งประโยคภาษาอังกฤษขั้นสูง"
                  className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddBookModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddNewBook}
                className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold"
              >
                เพิ่มหนังสือ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
