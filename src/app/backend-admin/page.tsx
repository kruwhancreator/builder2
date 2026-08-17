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
  BookOpen,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  BookMarked,
  GripVertical,
  Layers,
  FileText,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

const INITIAL_BOOKS = [
  { 
    id: 'sentence-builder-vol-1', 
    title: 'Sentence Builder Vol. 1', 
    subtitle: 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ Vol. 1 (เทคนิคปูพื้นฐาน)', 
    total_units: 0,
    created_at: '2026-07-22T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-2', 
    title: 'Sentence Builder Vol. 2', 
    subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2 (Core + Context + Connect)', 
    total_units: 1,
    created_at: '2026-07-20T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-3', 
    title: 'Sentence Builder Vol. 3', 
    subtitle: 'แบบฝึกหัดแต่งประโยคขั้นสูง Vol. 3 (Advanced Business & Writing)', 
    total_units: 0,
    created_at: '2026-07-01T00:00:00.000Z'
  },
];

export default function BackendAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation State
  const [activeView, setActiveView] = useState<'books_list' | 'curriculum_view'>('books_list');
  const [booksList, setBooksList] = useState<any[]>(INITIAL_BOOKS);
  const [selectedBook, setSelectedBook] = useState<string>('sentence-builder-vol-2');

  // Curriculum Units State
  const [curriculumUnits, setCurriculumUnits] = useState<any[]>([]);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);

  // Book Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookFormData, setBookFormData] = useState({ id: '', title: '', subtitle: '' });
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  // Unit Modal State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnitNum, setEditingUnitNum] = useState<number | null>(null);
  const [unitFormData, setUnitFormData] = useState({ unit_number: 1, title: '', subtitle: '' });

  // Quiz Editor Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuizExercise, setCurrentQuizExercise] = useState<{
    unit: any;
    exercise: any;
  } | null>(null);
  const [quizItems, setQuizItems] = useState<any[]>([]);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch dynamic Books List (with calculated unit counts)
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

  // Fetch Curriculum Units & Exercises from 'units' table for selected book
  const fetchCurriculum = (bookId: string) => {
    setIsLoadingCurriculum(true);
    fetch(`/api/admin/curriculum?book=${bookId}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.units)) {
          setCurriculumUnits(data.units);
        }
      })
      .catch(err => console.warn('Error fetching units:', err))
      .finally(() => setIsLoadingCurriculum(false));
  };

  useEffect(() => {
    fetchBooksList();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      fetchCurriculum(selectedBook);
    }
  }, [selectedBook]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Passcode ไม่ถูกต้อง (รหัสผ่านเริ่มต้น: admin123)');
    }
  };

  // Book Handlers
  const openCreateBookModal = () => {
    setEditingBookId(null);
    setBookFormData({ id: '', title: '', subtitle: '' });
    setShowBookModal(true);
  };

  const openEditBookModal = (book: any) => {
    setEditingBookId(book.id);
    setBookFormData({ id: book.id, title: book.title || '', subtitle: book.subtitle || '' });
    setShowBookModal(true);
  };

  const handleSaveBook = async () => {
    if (!bookFormData.title.trim()) {
      alert('กรุณากรอกชื่อหนังสือ');
      return;
    }

    setIsSubmittingBook(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookFormData)
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
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือ "${bookTitle}" (${bookId})?\n\nการลบนี้จะลบ Unit และเฉลยทั้งหมดของหนังสือเล่มนี้อย่างถาวร!`)) {
      return;
    }

    setDeletingBookId(bookId);
    try {
      const res = await fetch(`/api/admin/books?id=${encodeURIComponent(bookId)}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🗑️ ลบหนังสือ "${bookTitle}" เรียบร้อยแล้ว!` });
        setBooksList(prev => prev.filter(b => b.id !== bookId));
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

  // Unit Handlers
  const openAddUnitModal = () => {
    const nextNum = curriculumUnits.length + 1;
    setEditingUnitNum(null);
    setUnitFormData({
      unit_number: nextNum,
      title: `Unit ${nextNum}: Sentence Practice`,
      subtitle: `บทที่ ${nextNum} : แบบฝึกหัดแต่งประโยคภาษาอังกฤษชุดที่ ${nextNum}`
    });
    setShowUnitModal(true);
  };

  const openEditUnitModal = (unit: any) => {
    setEditingUnitNum(unit.unit_number);
    setUnitFormData({
      unit_number: unit.unit_number,
      title: unit.title || '',
      subtitle: unit.subtitle || ''
    });
    setShowUnitModal(true);
  };

  const handleSaveUnit = async () => {
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_unit',
          bookName: selectedBook,
          unitData: unitFormData
        })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🎉 บันทึก Unit ${unitFormData.unit_number} เรียบร้อยแล้ว!` });
        fetchCurriculum(selectedBook);
        fetchBooksList();
        setShowUnitModal(false);
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการบันทึก Unit' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    }
  };

  const handleDeleteUnit = async (unitNumber: number, title: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ Unit ${unitNumber} (${title})?`)) return;

    try {
      const res = await fetch(`/api/admin/curriculum?action=delete_unit&book=${selectedBook}&unit=${unitNumber}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🗑️ ลบ Unit ${unitNumber} เรียบร้อยแล้ว!` });
        fetchCurriculum(selectedBook);
        fetchBooksList();
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการลบ Unit' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ' });
    }
  };

  // Quiz Editor Handlers
  const openQuizEditor = (unit: any, exercise: any) => {
    setCurrentQuizExercise({ unit, exercise });
    setQuizItems(JSON.parse(JSON.stringify(exercise.items || [])));
    setShowQuizModal(true);
  };

  const handleAddQuestion = () => {
    const nextIdx = quizItems.length + 1;
    const exType = currentQuizExercise?.exercise.type;
    
    const newItem: any = {
      id: nextIdx,
      item_number: nextIdx,
      model_answer: ''
    };

    if (exType === 'translation') {
      newItem.thai = 'พิมพ์โจทย์ภาษาไทย...';
    } else if (exType === 'guided_sentence') {
      newItem.prompt = 'I am ____________________.';
    } else if (exType === 'picture_description') {
      newItem.image_description = 'คำบรรยายภาพ...';
      newItem.context_hint = 'คำใบ้บริบท...';
    }

    setQuizItems(prev => [...prev, newItem]);
  };

  const handleUpdateQuestion = (idx: number, field: string, value: any) => {
    setQuizItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuizItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveQuiz = async () => {
    if (!currentQuizExercise) return;
    setIsSavingQuiz(true);

    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_quiz_items',
          bookName: selectedBook,
          unit_id: currentQuizExercise.unit.id,
          unit_number: currentQuizExercise.unit.unit_number,
          exercise_code: currentQuizExercise.exercise.code,
          items: quizItems
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🎉 บันทึกคำถามและเฉลยสำหรับ ${currentQuizExercise.exercise.title} เรียบร้อยแล้ว!` });
        fetchCurriculum(selectedBook);
        setShowQuizModal(false);
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการบันทึกคำถาม' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSavingQuiz(false);
    }
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
            ระบบจัดการ Books, Units, Exercises & Quizzes
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
              onClick={() => setActiveView('books_list')}
              className={`sidebar-nav-item w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'books_list' ? 'active-nav-item bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="nav-item-icon w-4 h-4" />
              <span className="nav-item-label">Books Management</span>
            </button>

            {activeView === 'curriculum_view' && (
              <button
                className="sidebar-nav-item active-nav-item w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer bg-[#2563eb] text-white shadow-xs"
              >
                <Layers className="nav-item-icon w-4 h-4" />
                <span className="nav-item-label">Units & Curriculum</span>
              </button>
            )}
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
          {/* LEVEL 1: BOOKS MANAGEMENT TABLE */}
          {/* ========================================================= */}
          {activeView === 'books_list' && (
            <section className="books-management-section w-full">
              <div className="section-header-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
                <div className="section-title-box">
                  <h1 className="section-main-heading text-2xl font-extrabold text-slate-900 font-heading">
                    Books Management
                  </h1>
                  <p className="section-description text-slate-500 text-xs mt-1">
                    จัดการรายการหนังสือ และเข้าจัดการ Units ประจำแต่ละเล่ม
                  </p>
                </div>

                <button
                  onClick={openCreateBookModal}
                  className="btn-create-new-book bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Book</span>
                </button>
              </div>

              <div className="books-table-card w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="table-responsive-wrapper w-full overflow-x-auto">
                  <table className="crud-books-table w-full text-left border-collapse">
                    <thead>
                      <tr className="table-header-row bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="th-title py-4 px-6 w-1/2">Title</th>
                        <th className="th-units py-4 px-4 w-1/6">Units (Calculated)</th>
                        <th className="th-date py-4 px-4 w-1/6">Date Added</th>
                        <th className="th-actions py-4 px-6 text-right w-1/6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="table-body-rows divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {booksList.map((book) => {
                        const dateStr = book.created_at ? new Date(book.created_at).toLocaleDateString('en-US') : '7/20/2026';
                        const unitsCount = book.total_units || 0;
                        return (
                          <tr key={book.id} className="book-item-row hover:bg-slate-50/80 transition-colors">
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

                            <td className="td-units-cell py-4 px-4">
                              <span className="units-count-pill inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100">
                                {unitsCount} {unitsCount === 1 ? 'Unit' : 'Units'}
                              </span>
                            </td>

                            <td className="td-date-cell py-4 px-4 text-slate-500 font-mono text-[11px]">
                              {dateStr}
                            </td>

                            <td className="td-actions-cell py-4 px-6 text-right">
                              <div className="actions-button-group flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditBookModal(book)}
                                  title="แก้ไขข้อมูลหนังสือ"
                                  className="btn-edit-book p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedBook(book.id);
                                    setActiveView('curriculum_view');
                                  }}
                                  title="เข้าสู่หน้าจัดการ Units & เฉลย"
                                  className="btn-manage-units px-3 py-1.5 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>จัดการ Units & เฉลย</span>
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
          {/* LEVEL 2: UNITS & CURRICULUM MANAGEMENT VIEW */}
          {/* ========================================================= */}
          {activeView === 'curriculum_view' && (
            <section className="curriculum-management-section w-full">
              {/* Back to Books Link */}
              <div className="back-navigation-bar mb-4 flex items-center justify-between">
                <button
                  onClick={() => setActiveView('books_list')}
                  className="btn-back-to-books inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back to Books Management</span>
                </button>

                <Link
                  href={`/${activeBookObj.id}`}
                  target="_blank"
                  className="btn-preview-book text-xs px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ดูหน้าหนังสือจริง (Student View)</span>
                </Link>
              </div>

              {/* CURRICULUM TOP HEADER */}
              <div className="curriculum-top-header flex items-center justify-between mb-6 pb-2">
                <div className="curriculum-title-container flex items-center gap-3">
                  <Layers className="w-6 h-6 text-[#2563eb]" />
                  <div>
                    <h1 className="curriculum-main-title text-2xl font-extrabold text-slate-900 font-heading">
                      Units Management (Curriculum)
                    </h1>
                    <p className="curriculum-subtitle text-xs text-slate-500 mt-0.5">
                      {activeBookObj.title} ({curriculumUnits.length} Units)
                    </p>
                  </div>
                </div>

                <button
                  onClick={openAddUnitModal}
                  className="btn-add-unit bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all hover:border-slate-400"
                >
                  <Plus className="w-4 h-4 text-[#2563eb]" />
                  <span>+ Add Unit</span>
                </button>
              </div>

              {/* UNITS & EXERCISES LIST CONTAINER */}
              {isLoadingCurriculum ? (
                <div className="loading-state py-12 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#2563eb]" />
                  <span>กำลังโหลดข้อมูล Units จากฐานข้อมูล...</span>
                </div>
              ) : curriculumUnits.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-700 text-sm">ยังไม่มี Unit ในหนังสือเล่มนี้</h3>
                  <p className="text-slate-400 text-xs mt-1 mb-4">คลิกปุ่มด้านล่างเพื่อเริ่มสร้าง Unit แรก</p>
                  <button
                    onClick={openAddUnitModal}
                    className="bg-[#2563eb] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer hover:bg-[#1d4ed8]"
                  >
                    + Add First Unit
                  </button>
                </div>
              ) : (
                <div className="curriculum-units-list space-y-4">
                  {curriculumUnits.map((unit) => (
                    <div 
                      key={unit.unit_number} 
                      className="unit-card bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                    >
                      {/* UNIT HEADER ROW */}
                      <div className="unit-header-row p-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-4">
                        <div className="unit-info-box flex items-center gap-3">
                          <GripVertical className="unit-drag-handle w-4 h-4 text-slate-400 cursor-grab" />
                          <div className="unit-title-group">
                            <h2 className="unit-title-text font-extrabold text-slate-900 text-sm">
                              Unit {unit.unit_number}: {unit.title}
                            </h2>
                            {unit.subtitle && (
                              <p className="unit-subtitle-text text-[11px] text-slate-500 mt-0.5">
                                {unit.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* UNIT ACTION TOOLBAR */}
                        <div className="unit-action-toolbar flex items-center gap-1.5 text-slate-500">
                          <button
                            onClick={() => openEditUnitModal(unit)}
                            title="Edit Unit Info"
                            className="btn-edit-unit p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-600 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteUnit(unit.unit_number, unit.title)}
                            title="Delete Unit"
                            className="btn-delete-unit p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* NESTED EXERCISES LIST */}
                      <div className="unit-exercises-container p-3 sm:px-6 space-y-2">
                        {unit.exercises && unit.exercises.map((exercise: any) => (
                          <div
                            key={exercise.code}
                            className="exercise-item-row bg-white border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between gap-4 hover:border-blue-300 hover:shadow-2xs transition-all"
                          >
                            <div className="exercise-main-content flex items-center gap-3 min-w-0">
                              <GripVertical className="exercise-drag-handle w-3.5 h-3.5 text-slate-300 cursor-grab" />
                              
                              <div className="exercise-icon-badge w-8 h-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold shrink-0">
                                {exercise.type === 'translation' && <FileText className="w-4 h-4" />}
                                {exercise.type === 'guided_sentence' && <Sparkles className="w-4 h-4" />}
                                {exercise.type === 'picture_description' && <ImageIcon className="w-4 h-4" />}
                              </div>

                              <div className="exercise-title-box truncate">
                                <span className="exercise-title-text font-bold text-slate-800 text-xs truncate block">
                                  {exercise.title}
                                </span>
                              </div>
                            </div>

                            {/* EXERCISE BADGES & ACTION BUTTONS */}
                            <div className="exercise-right-actions flex items-center gap-3 shrink-0">
                              <span className="exercise-item-count-badge text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {exercise.itemCount || (exercise.items ? exercise.items.length : 0)} Questions
                              </span>

                              <span className="exercise-free-tag text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                Free
                              </span>

                              <div className="exercise-actions-toolbar flex items-center gap-1 pl-2 border-l border-slate-100">
                                <button
                                  onClick={() => openQuizEditor(unit, exercise)}
                                  title="Manage Quiz & Questions"
                                  className="btn-edit-quiz p-1.5 text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span className="hidden sm:inline">จัดการเฉลย/ข้อ</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* LEVEL 3: QUIZ / QUESTION ITEMS MANAGER MODAL */}
      {/* ========================================================= */}
      {showQuizModal && currentQuizExercise && (
        <div className="quiz-modal-backdrop fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="quiz-modal-card bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="quiz-modal-header p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-extrabold text-[#2563eb] uppercase tracking-wider">
                  Unit {currentQuizExercise.unit.unit_number}: {currentQuizExercise.unit.title}
                </div>
                <h3 className="quiz-modal-heading text-lg font-bold text-slate-900 font-heading mt-0.5">
                  📝 {currentQuizExercise.exercise.title} (Quiz Manager)
                </h3>
              </div>
              <button onClick={() => setShowQuizModal(false)} className="modal-close-btn text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            {/* Modal Questions Body */}
            <div className="quiz-modal-body flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase">
                  รายการข้อสอบ/คำถาม ({quizItems.length} ข้อ):
                </span>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="btn-add-question-item bg-blue-50 text-[#2563eb] hover:bg-[#2563eb] hover:text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มข้อใหม่</span>
                </button>
              </div>

              {quizItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-xl">
                  ยังไม่มีคำถามในแบบฝึกหัดนี้ คลิก &quot;+ เพิ่มข้อใหม่&quot; เพื่อสร้างข้อสอบ
                </div>
              ) : (
                quizItems.map((q, idx) => (
                  <div key={idx} className="quiz-item-box bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-2xs relative">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                      <div className="font-extrabold text-[#1e3a8a] text-sm">
                        ข้อที่ {idx + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบข้อนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Translation Prompt */}
                      {currentQuizExercise.exercise.type === 'translation' && (
                        <div>
                          <label className="block font-bold text-slate-700 uppercase mb-1">
                            📍 โจทย์ภาษาไทย:
                          </label>
                          <input
                            type="text"
                            value={q.thai || q.thai_prompt || ''}
                            onChange={(e) => handleUpdateQuestion(idx, 'thai', e.target.value)}
                            placeholder="เช่น ฉันกำลังเดินทางเพื่อกลับบ้าน"
                            className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#2563eb]"
                          />
                        </div>
                      )}

                      {/* Guided Sentence Prompt */}
                      {currentQuizExercise.exercise.type === 'guided_sentence' && (
                        <div>
                          <label className="block font-bold text-slate-700 uppercase mb-1">
                            📍 โจทย์ข้อความ (Fill in the blanks):
                          </label>
                          <input
                            type="text"
                            value={q.prompt || ''}
                            onChange={(e) => handleUpdateQuestion(idx, 'prompt', e.target.value)}
                            placeholder="เช่น I am ____________________."
                            className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#2563eb]"
                          />
                        </div>
                      )}

                      {/* Picture Description */}
                      {currentQuizExercise.exercise.type === 'picture_description' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              🖼️ คำบรรยายภาพ:
                            </label>
                            <input
                              type="text"
                              value={q.image_description || ''}
                              onChange={(e) => handleUpdateQuestion(idx, 'image_description', e.target.value)}
                              placeholder="เช่น ผู้ชายกำลังดื่มกาแฟในคาเฟ่"
                              className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#2563eb]"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              💡 คำใบ้บริบทภาพ:
                            </label>
                            <input
                              type="text"
                              value={q.context_hint || ''}
                              onChange={(e) => handleUpdateQuestion(idx, 'context_hint', e.target.value)}
                              placeholder="เช่น ดื่มกาแฟ / ในคาเฟ่ / เพื่อความสดชื่น"
                              className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#2563eb]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Target Model Answer */}
                      <div>
                        <label className="block font-extrabold text-[#1e3a8a] uppercase mb-1">
                          🎯 เฉลยคำตอบภาษาอังกฤษ (Model Answer):
                        </label>
                        <input
                          type="text"
                          value={q.model_answer || ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'model_answer', e.target.value)}
                          placeholder="เช่น I am commuting to get home."
                          className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="quiz-modal-footer p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
              <span className="text-[11px] text-slate-500 font-medium">
                ระบบจะบันทึกข้อสอบและอัปเดตลงตาราง exercise_items ใน Supabase ทันที
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200/80 text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-300"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={isSavingQuiz}
                  className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer shadow-md"
                >
                  {isSavingQuiz ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>บันทึก Quiz ({quizItems.length} ข้อ)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT UNIT MODAL */}
      {/* ========================================================= */}
      {showUnitModal && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="modal-content-card bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="modal-header flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="modal-title text-lg font-bold text-slate-900 font-heading">
                {editingUnitNum ? `📝 แก้ไข Unit ${editingUnitNum}` : '➕ Add New Unit'}
              </h3>
              <button onClick={() => setShowUnitModal(false)} className="modal-close-btn text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="modal-form-body space-y-4 text-xs">
              <div className="form-group-unit-num">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1">
                  Unit Number:
                </label>
                <input
                  type="number"
                  value={unitFormData.unit_number}
                  onChange={(e) => setUnitFormData(prev => ({ ...prev, unit_number: Number(e.target.value) }))}
                  className="input-unit-num w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="form-group-title">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1">
                  Unit Title:
                </label>
                <input
                  type="text"
                  value={unitFormData.title}
                  onChange={(e) => setUnitFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น Present Continuous & Sentence Expansion"
                  className="input-unit-title w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="form-group-subtitle">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1">
                  Unit Subtitle:
                </label>
                <textarea
                  rows={3}
                  value={unitFormData.subtitle}
                  onChange={(e) => setUnitFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="เช่น บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]"
                  className="input-unit-subtitle w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <div className="modal-footer flex justify-end gap-2 mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowUnitModal(false)}
                className="btn-modal-cancel px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleSaveUnit}
                className="btn-modal-submit px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>บันทึก Unit</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                  value={bookFormData.title}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, title: e.target.value }))}
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
                  value={bookFormData.subtitle}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, subtitle: e.target.value }))}
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
                onClick={handleSaveBook}
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
