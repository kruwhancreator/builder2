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
  Trash2,
  Edit,
  ExternalLink,
  BookMarked
} from 'lucide-react';
import initialChapterData from '@/data/sentence-builder-vol-2/chapter-1.json';

const INITIAL_BOOKS = [
  { 
    id: 'sentence-builder-vol-1', 
    title: 'Sentence Builder Vol. 1', 
    subtitle: 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ Vol. 1 (เทคนิคปูพื้นฐาน)', 
    total_units: 30,
    created_at: '2026-07-22T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-2', 
    title: 'Sentence Builder Vol. 2', 
    subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2 (Core + Context + Connect)', 
    total_units: 30,
    created_at: '2026-07-20T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-3', 
    title: 'Sentence Builder Vol. 3', 
    subtitle: 'แบบฝึกหัดแต่งประโยคขั้นสูง Vol. 3 (Advanced Business & Writing)', 
    total_units: 30,
    created_at: '2026-07-01T00:00:00.000Z'
  },
];

export default function BackendAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation State
  const [activeView, setActiveView] = useState<'books_list' | 'book_editor'>('books_list');
  const [booksList, setBooksList] = useState<any[]>(INITIAL_BOOKS);
  const [selectedBook, setSelectedBook] = useState<string>('sentence-builder-vol-2');
  const [selectedUnit, setSelectedUnit] = useState<number>(1);

  // Create/Edit Book Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subtitle: '',
    totalUnits: 30
  });
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

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

  // Fetch dynamic Books List from Supabase Database
  const fetchBooksList = () => {
    fetch('/api/admin/books')
      .then(res => res.json())
      .then(fetchedBooks => {
        if (Array.isArray(fetchedBooks) && fetchedBooks.length > 0) {
          setBooksList(fetchedBooks);
        }
      })
      .catch(err => console.warn('Could not fetch books list:', err));
  };

  useEffect(() => {
    fetchBooksList();
  }, []);

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

  const openCreateModal = () => {
    setEditingBookId(null);
    setFormData({
      id: '',
      title: '',
      subtitle: '',
      totalUnits: 30
    });
    setShowBookModal(true);
  };

  const openEditModal = (book: any) => {
    setEditingBookId(book.id);
    setFormData({
      id: book.id,
      title: book.title || '',
      subtitle: book.subtitle || '',
      totalUnits: book.total_units || 30
    });
    setShowBookModal(true);
  };

  const handleSaveBookForm = async () => {
    if (!formData.title.trim()) {
      alert('กรุณากรอกชื่อหนังสือ');
      return;
    }

    setIsSubmittingBook(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🎉 ${resData.message || 'บันทึกข้อมูลหนังสือเรียบร้อยแล้ว!'}` });
        fetchBooksList();
        setShowBookModal(false);
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการบันทึกหนังสือ' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSubmittingBook(false);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือ "${bookTitle}" (${bookId})?\n\nการลบนี้จะลบ Unit และสถิติทั้งหมดของหนังสือเล่มนี้อย่างถาวร!`)) {
      return;
    }

    setDeletingBookId(bookId);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/admin/books?id=${encodeURIComponent(bookId)}`, {
        method: 'DELETE'
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🗑️ ลบหนังสือ "${bookTitle}" เรียบร้อยแล้ว!` });
        setBooksList(prev => prev.filter(b => b.id !== bookId));
        if (selectedBook === bookId) {
          setSelectedBook('sentence-builder-vol-2');
        }
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการลบหนังสือ' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบหนังสือ' });
    } finally {
      setDeletingBookId(null);
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
      <div className="login-screen-container min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <div className="login-card max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="login-icon-box w-14 h-14 rounded-2xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center mx-auto mb-4 border border-[#2563eb]/20">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="login-title text-2xl font-extrabold text-slate-900 mb-1 font-heading">
            Engonair Admin Login
          </h1>
          <p className="login-subtitle text-slate-500 text-xs mb-6">
            ระบบจัดการหนังสือ, เฉลย & Analytics
          </p>

          <form onSubmit={handleLogin} className="login-form space-y-4">
            <div className="login-input-group">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="กรอก Passcode ( admin123 )"
                className="login-passcode-input w-full rounded-xl bg-slate-50 border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-center font-mono"
              />
            </div>

            {authError && (
              <p className="login-error-message text-xs text-[#dc2626] font-semibold">{authError}</p>
            )}

            <button
              type="submit"
              className="login-submit-btn w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>เข้าสู่ระบบ Engonair Admin</span>
            </button>
          </form>

          <div className="login-footer mt-6 pt-4 border-t border-slate-200">
            <Link href="/sentence-builder-vol-2" className="login-back-link text-xs text-[#2563eb] font-bold hover:underline flex items-center justify-center gap-1">
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
    <div className="admin-page-layout min-h-screen bg-[#f4f6f8] text-slate-800 flex flex-col font-sans">
      {/* ========================================================= */}
      {/* ENGONAIR ADMIN TOP NAVBAR */}
      {/* ========================================================= */}
      <header className="admin-top-navbar h-16 bg-white border-b border-slate-200 px-6 flex items-center sticky top-0 z-30 shadow-xs">
        <div className="navbar-brand-box flex items-center gap-3">
          <div className="navbar-logo-icon w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-lg font-heading">
            E
          </div>
          <span className="navbar-brand-text text-lg font-extrabold text-[#1e3a8a] tracking-tight font-heading">
            Engonair <span className="brand-highlight text-[#2563eb] font-bold">Admin</span>
          </span>
        </div>
      </header>

      <div className="admin-body-container flex-1 flex w-full">
        {/* ========================================================= */}
        {/* ENGONAIR ADMIN LEFT SIDEBAR */}
        {/* ========================================================= */}
        <aside className="admin-sidebar w-60 bg-white border-r border-slate-200 py-6 flex flex-col justify-between shrink-0 hidden lg:flex">
          <nav className="sidebar-nav-menu space-y-1.5 px-3">
            <button
              onClick={() => {
                setActiveView('books_list');
              }}
              className="sidebar-nav-item active-nav-item w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer bg-[#2563eb] text-white shadow-xs"
            >
              <BookOpen className="nav-item-icon w-4 h-4" />
              <span className="nav-item-label">Books Management</span>
            </button>
          </nav>

          <div className="sidebar-footer-box px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400">
            <span className="system-version-tag">Sentence Builder Advisor v2.0</span>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENT WORKSPACE (FULL WIDTH CONTAINER) */}
        {/* ========================================================= */}
        <main className="admin-main-content flex-1 w-full p-6 lg:p-8">
          {/* Toast Notification */}
          {saveMessage && (
            <div className={`admin-toast-alert mb-6 p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-xs ${
              saveMessage.type === 'success' 
                ? 'toast-success bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'toast-error bg-red-50 text-red-800 border-red-200'
            }`}>
              <div className="toast-content flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="toast-text">{saveMessage.text}</span>
              </div>
              <button onClick={() => setSaveMessage(null)} className="toast-close-btn text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          {/* ========================================================= */}
          {/* LEVEL 1: BOOKS MANAGEMENT TABLE (FULL WIDTH) */}
          {/* ========================================================= */}
          {activeView === 'books_list' && (
            <section className="books-management-section w-full">
              {/* Header Title + Create Button */}
              <div className="section-header-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
                <div className="section-title-box">
                  <h1 className="section-main-heading text-2xl font-extrabold text-slate-900 font-heading">
                    Books Management
                  </h1>
                  <p className="section-description text-slate-500 text-xs mt-1">
                    จัดการรายการหนังสือ (Units 1 - 30) และปรับแต่งเฉลยประจำแต่ละเล่ม
                  </p>
                </div>

                <button
                  onClick={openCreateModal}
                  className="btn-create-new-book bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Book</span>
                </button>
              </div>

              {/* Data Table Container - FULL WIDTH */}
              <div className="books-table-card w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="table-responsive-wrapper w-full overflow-x-auto">
                  <table className="crud-books-table w-full text-left border-collapse">
                    <thead>
                      <tr className="table-header-row bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="th-title py-4 px-6 w-1/2">Title</th>
                        <th className="th-units py-4 px-4 w-1/6">Units</th>
                        <th className="th-date py-4 px-4 w-1/6">Date Added</th>
                        <th className="th-actions py-4 px-6 text-right w-1/6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="table-body-rows divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {booksList.map((book) => {
                        const dateStr = book.created_at ? new Date(book.created_at).toLocaleDateString('en-US') : '7/20/2026';
                        return (
                          <tr key={book.id} className="book-item-row hover:bg-slate-50/80 transition-colors">
                            {/* Title & Subtitle */}
                            <td className="td-title-cell py-4 px-6">
                              <div className="book-title-container flex items-center gap-3">
                                <div className="book-thumbnail-box w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#2563eb] flex items-center justify-center font-bold shrink-0">
                                  <BookMarked className="w-5 h-5" />
                                </div>
                                <div className="book-info-box">
                                  <div className="book-name-text font-extrabold text-slate-900 text-sm line-clamp-1">
                                    {book.title}
                                  </div>
                                  <div className="book-subtitle-text text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {book.subtitle}
                                  </div>
                                  <div className="book-url-slug text-[10px] text-slate-400 font-mono mt-0.5">
                                    URL: /{book.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Total Units */}
                            <td className="td-units-cell py-4 px-4">
                              <span className="units-count-pill inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100">
                                {book.total_units || 30} Units
                              </span>
                            </td>

                            {/* Date Added */}
                            <td className="td-date-cell py-4 px-4 text-slate-500 font-mono text-[11px]">
                              {dateStr}
                            </td>

                            {/* Actions */}
                            <td className="td-actions-cell py-4 px-6 text-right">
                              <div className="actions-button-group flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(book)}
                                  title="แก้ไขชื่อและรายละเอียดหนังสือ"
                                  className="btn-edit-book p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedBook(book.id);
                                    setActiveView('book_editor');
                                  }}
                                  title="จัดการเฉลย & สถิติ"
                                  className="btn-manage-units px-3 py-1.5 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  <span>จัดการเฉลย & สถิติ</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteBook(book.id, book.title)}
                                  disabled={deletingBookId === book.id}
                                  title="ลบหนังสือ"
                                  className="btn-delete-book p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  {deletingBookId === book.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* LEVEL 2: SELECTED BOOK CONTENT & ANALYTICS EDITOR */}
          {/* ========================================================= */}
          {activeView === 'book_editor' && (
            <section className="book-editor-section w-full">
              {/* Back to Books Directory Link */}
              <div className="back-navigation-bar mb-4">
                <button
                  onClick={() => setActiveView('books_list')}
                  className="btn-back-to-books inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← กลับสู่ Books Management Table</span>
                </button>
              </div>

              {/* Header Banner for Selected Book */}
              <div className="editor-banner-card w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
                <div className="editor-title-box">
                  <div className="book-badge-pill inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold uppercase tracking-wider mb-2">
                    📘 หนังสือ: {activeBookObj.title}
                  </div>
                  <h1 className="editor-main-heading text-2xl font-extrabold text-slate-900 font-heading">
                    จัดการเฉลย & ดูสถิติ ({activeBookObj.title})
                  </h1>
                  <p className="editor-sub-info text-slate-600 text-xs mt-1">
                    URL: /{activeBookObj.id} • แก้ไขโจทย์และเฉลยภาษาอังกฤษประจำแต่ละ Unit
                  </p>
                </div>

                <div className="editor-top-actions flex items-center gap-2 shrink-0">
                  <Link
                    href={`/${activeBookObj.id}`}
                    target="_blank"
                    className="btn-preview-book text-xs px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ดูหน้าหนังสือ</span>
                  </Link>

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-save-answers-top bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
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
                <div className="analytics-card-section w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
                  <div className="analytics-header flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <h2 className="analytics-title text-lg font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#2563eb]" />
                      <span>สถิติผู้ใช้งาน: {activeBookObj.title}</span>
                    </h2>
                    <span className="analytics-book-slug text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] font-mono">
                      /{selectedBook}
                    </span>
                  </div>

                  <div className="metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="metric-box bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
                      <div className="metric-header flex items-center justify-between text-slate-500 mb-2">
                        <span className="metric-label text-xs font-semibold">ยอดสแกน QR Code</span>
                        <QrCode className="w-4 h-4 text-[#2563eb]" />
                      </div>
                      <div className="metric-value text-2xl font-extrabold text-slate-900 font-heading">
                        {analytics.totalQrScans.toLocaleString()} <span className="unit-label text-xs font-normal text-slate-500">ครั้ง</span>
                      </div>
                      <p className="metric-hint text-[11px] text-slate-500 mt-1">สแกนเข้าหน้ารวมเล่ม</p>
                    </div>

                    <div className="metric-box bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
                      <div className="metric-header flex items-center justify-between text-slate-500 mb-2">
                        <span className="metric-label text-xs font-semibold">ผู้เรียนที่เริ่มทำ Unit 1</span>
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="metric-value text-2xl font-extrabold text-slate-900 font-heading">
                        {analytics.unit1Views.toLocaleString()} <span className="unit-label text-xs font-normal text-slate-500">คน</span>
                      </div>
                      <p className="metric-hint text-[11px] text-emerald-600 mt-1 font-semibold">
                        Conversion: {analytics.qrToUnit1Conversion}%
                      </p>
                    </div>

                    <div className="metric-box bg-[#f8fafc] rounded-xl p-4 border border-slate-200">
                      <div className="metric-header flex items-center justify-between text-slate-500 mb-2">
                        <span className="metric-label text-xs font-semibold">ผู้เรียนที่เรียนถึง Unit 30</span>
                        <GraduationCap className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="metric-value text-2xl font-extrabold text-slate-900 font-heading">
                        {analytics.unit30Views.toLocaleString()} <span className="unit-label text-xs font-normal text-slate-500">คน</span>
                      </div>
                      <p className="metric-hint text-[11px] text-purple-600 mt-1 font-semibold">
                        100% Finishers
                      </p>
                    </div>

                    <div className="metric-box metric-box-highlight bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white rounded-xl p-4 shadow-sm">
                      <div className="metric-header flex items-center justify-between opacity-90 mb-2">
                        <span className="metric-label text-xs font-semibold">อัตราการเรียนจบทั้งเล่ม</span>
                        <TrendingUp className="w-4 h-4 text-sky-300" />
                      </div>
                      <div className="metric-value text-3xl font-extrabold font-heading">
                        {analytics.courseCompletionRate}%
                      </div>
                      <p className="metric-hint text-[11px] opacity-80 mt-1">คำนวณจาก (Unit 30 / Unit 1)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Select Unit Selector */}
              <div className="unit-selector-card w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs mb-6 flex items-center justify-between gap-4">
                <label className="unit-selector-label text-xs font-bold text-slate-700 uppercase">
                  📌 เลือก Unit ของ {activeBookObj.title} ที่ต้องการแก้ไขเฉลย:
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(Number(e.target.value))}
                  className="unit-dropdown rounded-xl bg-slate-50 border border-slate-300 px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
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
                <div className="exercise-editor-card exercise-1-card w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
                  <h2 className="exercise-card-heading text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
                    ✏️ Exercise 1: แปลประโยคภาษาอังกฤษ ({activeBookObj.title} • Unit {selectedUnit})
                  </h2>

                  <div className="exercise-items-list space-y-6">
                    {ex1.items?.map((item: any, idx: number) => (
                      <div key={idx} className="exercise-item-box bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                        <div className="item-number-label font-bold text-[#1e3a8a] text-sm mb-3">
                          ข้อ {idx + 1}
                        </div>

                        <div className="item-inputs-stack space-y-3 text-xs">
                          <div className="input-group-prompt">
                            <label className="input-label block font-bold text-slate-700 uppercase mb-1">
                              📍 โจทย์ภาษาไทย:
                            </label>
                            <input
                              type="text"
                              value={item.thai || ''}
                              onChange={(e) => updateItemField('ex-1', idx, 'thai', e.target.value)}
                              className="input-thai-prompt w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                            />
                          </div>

                          <div className="input-group-answer">
                            <label className="input-label block font-extrabold text-[#1e3a8a] uppercase mb-1">
                              🎯 เฉลย:
                            </label>
                            <input
                              type="text"
                              value={item.model_answer || ''}
                              onChange={(e) => updateItemField('ex-1', idx, 'model_answer', e.target.value)}
                              className="input-model-answer w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
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
                <div className="exercise-editor-card exercise-2-card w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
                  <h2 className="exercise-card-heading text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
                    🧩 Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค ({activeBookObj.title} • Unit {selectedUnit})
                  </h2>

                  <div className="exercise-items-list space-y-6">
                    {ex2.items?.map((item: any, idx: number) => (
                      <div key={idx} className="exercise-item-box bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                        <div className="item-number-label font-bold text-[#1e3a8a] text-sm mb-3">
                          ข้อ {idx + 1}
                        </div>

                        <div className="item-inputs-stack space-y-3 text-xs">
                          <div className="input-group-prompt">
                            <label className="input-label block font-bold text-slate-700 uppercase mb-1">
                              📍 โจทย์ข้อความ:
                            </label>
                            <input
                              type="text"
                              value={item.prompt || ''}
                              onChange={(e) => updateItemField('ex-2', idx, 'prompt', e.target.value)}
                              className="input-guided-prompt w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                            />
                          </div>

                          <div className="input-group-answer">
                            <label className="input-label block font-extrabold text-[#1e3a8a] uppercase mb-1">
                              🎯 เฉลย:
                            </label>
                            <input
                              type="text"
                              value={item.model_answer || ''}
                              onChange={(e) => updateItemField('ex-2', idx, 'model_answer', e.target.value)}
                              className="input-model-answer w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
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
                <div className="exercise-editor-card exercise-3-card w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
                  <h2 className="exercise-card-heading text-xl font-bold text-[#1e3a8a] font-heading border-b border-slate-200 pb-3 mb-6">
                    🖼️ Exercise 3: แต่งจากภาพ ({activeBookObj.title} • Unit {selectedUnit})
                  </h2>

                  <div className="exercise-items-list space-y-6">
                    {ex3.items?.map((item: any, idx: number) => (
                      <div key={idx} className="exercise-item-box bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                        <div className="item-number-label font-bold text-[#1e3a8a] text-sm mb-3">
                          ภาพที่ {idx + 1}
                        </div>

                        <div className="item-inputs-stack space-y-3 text-xs">
                          <div className="image-details-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="input-group-img-desc">
                              <label className="input-label block font-bold text-slate-700 uppercase mb-1">
                                🖼️ คำบรรยายภาพ:
                              </label>
                              <input
                                type="text"
                                value={item.image_description || ''}
                                onChange={(e) => updateItemField('ex-3', idx, 'image_description', e.target.value)}
                                className="input-img-description w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                              />
                            </div>
                            <div className="input-group-context-hint">
                              <label className="input-label block font-bold text-slate-700 uppercase mb-1">
                                💡 คำใบ้บริบทภาพ:
                              </label>
                              <input
                                type="text"
                                value={item.context_hint || ''}
                                onChange={(e) => updateItemField('ex-3', idx, 'context_hint', e.target.value)}
                                className="input-context-hint w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#2563eb]"
                              />
                            </div>
                          </div>

                          <div className="input-group-answer">
                            <label className="input-label block font-extrabold text-[#1e3a8a] uppercase mb-1">
                              🎯 เฉลย:
                            </label>
                            <input
                              type="text"
                              value={item.model_answer || ''}
                              onChange={(e) => updateItemField('ex-3', idx, 'model_answer', e.target.value)}
                              className="input-model-answer w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Floating Save Button */}
              <div className="floating-save-container sticky bottom-6 mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-floating-save bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 border border-white/20 transition-colors cursor-pointer"
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
            </section>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* CREATE / EDIT BOOK MODAL */}
      {/* ========================================================= */}
      {showBookModal && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="modal-content-card bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="modal-header flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="modal-title text-lg font-bold text-slate-900 font-heading">
                {editingBookId ? '📝 แก้ไขข้อมูลหนังสือ' : '➕ สร้างหนังสือใหม่ (Create New Book)'}
              </h3>
              <button onClick={() => setShowBookModal(false)} className="modal-close-btn text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="modal-form-body space-y-4 text-xs">
              <div className="form-group-title">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1">
                  ชื่อหนังสือ (Title):
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น Sentence Builder Vol. 1"
                  className="input-book-title w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="form-group-subtitle">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1">
                  คำอธิบายแบบย่อ (Subtitle):
                </label>
                <textarea
                  rows={3}
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="เช่น แบบฝึกหัดแต่งประโยคและขยายประโยคภาษาอังกฤษ"
                  className="input-book-subtitle w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <div className="modal-footer flex justify-end gap-2 mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowBookModal(false)}
                className="btn-modal-cancel px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleSaveBookForm}
                disabled={isSubmittingBook}
                className="btn-modal-submit px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer shadow-md"
              >
                {isSubmittingBook ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>บันทึกหนังสือ</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
