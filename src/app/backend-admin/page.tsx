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
  ChevronRight,
  Trash2,
  Search,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Palette,
  ShoppingBag,
  ShoppingCart,
  UserCheck,
  Award,
  FileText,
  UserPlus,
  CreditCard,
  Globe,
  Target,
  Edit,
  ExternalLink,
  BookMarked
} from 'lucide-react';
import initialChapterData from '@/data/sentence-builder-vol-2/chapter-1.json';

const INITIAL_BOOKS = [
  { 
    id: 'sentence-builder-vol-1', 
    sku: 'SB-VOL-01',
    title: 'Sentence Builder Vol. 1 (เทคนิคปูพื้นฐาน)', 
    subtitle: 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ Vol. 1 ปูพื้นฐานไวยากรณ์และโครงสร้างประโยค', 
    price: 890,
    original_price: 1900,
    status: 'Published',
    cover_image_url: null,
    total_units: 30,
    created_at: '2026-07-22T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-2', 
    sku: 'SB-VOL-02',
    title: 'Sentence Builder Vol. 2 (Core + Context + Connect)', 
    subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2 ฝึกแต่งประโยคยาวอย่างเป็นธรรมชาติ', 
    price: 1590,
    original_price: 3160,
    status: 'Published',
    cover_image_url: null,
    total_units: 30,
    created_at: '2026-07-20T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-3', 
    sku: 'SB-VOL-03',
    title: 'Sentence Builder Vol. 3 (Advanced Business & Writing)', 
    subtitle: 'แบบฝึกหัดแต่งประโยคขั้นสูง Vol. 3 การแต่งประโยคระดับสูงสำหรับการทำงานและการเขียน', 
    price: 2590,
    original_price: 5160,
    status: 'Published',
    cover_image_url: null,
    total_units: 30,
    created_at: '2026-07-01T00:00:00.000Z'
  },
];

export default function BackendAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation State
  const [activeTab, setActiveTab] = useState('all_courses');
  const [activeView, setActiveView] = useState<'books_list' | 'book_editor'>('books_list');
  const [booksList, setBooksList] = useState<any[]>(INITIAL_BOOKS);
  const [selectedBook, setSelectedBook] = useState<string>('sentence-builder-vol-2');
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Create/Edit Book Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    sku: '',
    title: '',
    subtitle: '',
    price: 0,
    original_price: 0,
    status: 'Published',
    cover_image_url: ''
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
      sku: `SB-VOL-${(booksList.length + 1).toString().padStart(2, '0')}`,
      title: '',
      subtitle: '',
      price: 890,
      original_price: 1900,
      status: 'Published',
      cover_image_url: ''
    });
    setShowBookModal(true);
  };

  const openEditModal = (book: any) => {
    setEditingBookId(book.id);
    setFormData({
      id: book.id,
      sku: book.sku || `SB-${book.id.toUpperCase()}`,
      title: book.title || '',
      subtitle: book.subtitle || '',
      price: book.price || 0,
      original_price: book.original_price || 0,
      status: book.status || 'Published',
      cover_image_url: book.cover_image_url || ''
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
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center mx-auto mb-4 border border-[#2563eb]/20">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1 font-heading">
            Engonair Admin Login
          </h1>
          <p className="text-slate-500 text-xs mb-6">
            ระบบจัดการหนังสือ SKU, เฉลย & Analytics
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="กรอก Passcode ( admin123 )"
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-center font-mono"
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
              <span>เข้าสู่ระบบ Engonair Admin</span>
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
  const filteredBooks = booksList.filter(b => 
    b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ex1 = data.exercises['ex-1'];
  const ex2 = data.exercises['ex-2'];
  const ex3 = data.exercises['ex-3'];

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-800 flex flex-col font-sans">
      {/* ========================================================= */}
      {/* ENGONAIR ADMIN TOP NAVBAR */}
      {/* ========================================================= */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-lg">
              E
            </div>
            <span className="text-lg font-extrabold text-[#1e3a8a] tracking-tight font-heading">
              Engonair <span className="text-[#2563eb] font-bold">Admin</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Notification Icon */}
          <button className="relative p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ก
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900">กฤษติกาล แก้วประดิษฐ์</div>
              <div className="text-[10px] text-slate-500 font-semibold">Super Admin</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* ========================================================= */}
        {/* ENGONAIR ADMIN LEFT SIDEBAR */}
        {/* ========================================================= */}
        <aside className="w-64 bg-white border-r border-slate-200 py-4 flex flex-col justify-between shrink-0 hidden lg:flex">
          <nav className="space-y-1 px-3">
            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </a>

            <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-slate-400" />
                <span>Appearance</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-slate-400" />
                <span>Products</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <ShoppingCart className="w-4 h-4 text-slate-400" />
              <span>Orders</span>
            </a>

            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <UserCheck className="w-4 h-4 text-slate-400" />
              <span>Instructors</span>
            </a>

            {/* Courses / Books Submenu (Expanded Active Section) */}
            <div className="pt-2">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-[#2563eb] bg-blue-50/60 mb-1">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-[#2563eb]" />
                  <span>Courses / Books</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#2563eb]" />
              </div>

              <div className="pl-9 space-y-1 text-xs font-semibold">
                <button
                  onClick={() => {
                    setActiveTab('all_courses');
                    setActiveView('books_list');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'all_courses' ? 'bg-[#2563eb] text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Courses / Books
                </button>
                <a href="#" className="block px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md">Course Bundles</a>
                <a href="#" className="block px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md">Categories</a>
                <a href="#" className="block px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md">Tags</a>
                <a href="#" className="block px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md">Certificate Templates</a>
                <a href="#" className="block px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md">Assignments Inbox</a>
              </div>
            </div>

            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <UserPlus className="w-4 h-4 text-slate-400" />
              <span>Enrollments</span>
            </a>

            <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>Subscriptions</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Posts (SEO)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <Award className="w-4 h-4 text-slate-400" />
              <span>Memberships</span>
            </a>

            <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Global Page SEO</span>
            </a>

            <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-slate-400" />
                <span>Marketing</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </nav>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENT WORKSPACE */}
        {/* ========================================================= */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl">
          {/* Toast Notification */}
          {saveMessage && (
            <div className={`mb-6 p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-xs ${
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
          {/* LEVEL 1: COURSES / BOOKS MANAGEMENT TABLE (MOCKUP MATCH) */}
          {/* ========================================================= */}
          {activeView === 'books_list' && (
            <div>
              {/* Header Title + Create Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
                    Courses Management
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">
                    จัดการรายการหนังสือ/คอร์สเรียน, กำหนด SKU, ราคา, สถานะ และปรับแต่งเฉลยประจำเล่ม
                  </p>
                </div>

                <button
                  onClick={openCreateModal}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Course</span>
                </button>
              </div>

              {/* Data Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-4 px-6">Title</th>
                        <th className="py-4 px-4">SKU</th>
                        <th className="py-4 px-4">Price</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4">Date Added</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredBooks.map((book) => {
                        const dateStr = book.created_at ? new Date(book.created_at).toLocaleDateString('en-US') : '7/20/2026';
                        return (
                          <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Title & Cover Image */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-[#2563eb] flex items-center justify-center font-bold shrink-0 overflow-hidden">
                                  {book.cover_image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <BookMarked className="w-6 h-6" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900 text-sm line-clamp-1">
                                    {book.title}
                                  </div>
                                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {book.subtitle}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* SKU Code */}
                            <td className="py-4 px-4">
                              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                {book.sku || `SB-${book.id.toUpperCase()}`}
                              </span>
                            </td>

                            {/* Price (Original crossed-out & sale price) */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 font-heading">
                                {book.original_price > 0 && (
                                  <span className="line-through text-slate-400 text-[11px]">
                                    ฿{Number(book.original_price).toLocaleString()}
                                  </span>
                                )}
                                <span className="font-extrabold text-slate-900">
                                  ฿{Number(book.price || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>

                            {/* Status Pill Badge */}
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                book.status === 'Published' 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-600 border border-amber-200'
                              }`}>
                                {book.status || 'Published'}
                              </span>
                            </td>

                            {/* Date Added */}
                            <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                              {dateStr}
                            </td>

                            {/* Actions (Edit & Delete icons) */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(book)}
                                  title="แก้ไขข้อมูลหนังสือ / SKU"
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedBook(book.id);
                                    setActiveView('book_editor');
                                  }}
                                  title="จัดการเฉลย & สถิติ"
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#2563eb] hover:bg-[#2563eb] hover:text-white font-bold text-xs transition-all flex items-center gap-1"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  <span>เฉลย & สถิติ</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteBook(book.id, book.title)}
                                  disabled={deletingBookId === book.id}
                                  title="ลบหนังสือ"
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                  <span>← กลับสู่ Courses / Books Management Table</span>
                </button>
              </div>

              {/* Header Banner for Selected Book */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold uppercase tracking-wider mb-2">
                    📘 หนังสือ: {activeBookObj.title} ({activeBookObj.sku || 'SB-VOL-02'})
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
                    <ExternalLink className="w-3.5 h-3.5" />
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
        </main>
      </div>

      {/* ========================================================= */}
      {/* CREATE / EDIT BOOK MODAL */}
      {/* ========================================================= */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                {editingBookId ? '📝 แก้ไขข้อมูลหนังสือ & SKU' : '➕ สร้างหนังสือ/คอร์สใหม่ (Create New Course)'}
              </h3>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Book SKU Code:
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="เช่น SB-VOL-01"
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Status:
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  ชื่อหนังสือ (Title):
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น Sentence Builder Vol. 1"
                  className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  คำอธิบายแบบย่อ (Subtitle):
                </label>
                <textarea
                  rows={2}
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="เช่น แบบฝึกหัดแต่งประโยคและขยายประโยคภาษาอังกฤษ"
                  className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    ราคาขาย (Price ฿):
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="เช่น 890"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    ราคาเต็ม (Original Price ฿):
                  </label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, original_price: Number(e.target.value) }))}
                    placeholder="เช่น 1900"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowBookModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleSaveBookForm}
                disabled={isSubmittingBook}
                className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer shadow-md"
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
