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
  Image as ImageIcon,
  Bot,
  Sliders,
  Link2,
  QrCode,
  BarChart2,
  TrendingUp,
  Users,
  Award,
  Eye,
  ArrowUpRight,
  Upload,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const INITIAL_BOOKS = [
  { 
    id: 'sentence-builder-vol-2', 
    slug: 'sentence-builder-vol-2',
    title: 'Sentence Builder Vol. 2', 
    subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2 (Core + Context + Connect)', 
    total_units: 1,
    created_at: '2026-07-20T00:00:00.000Z'
  },
];

export default function BackendAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navigation State
  const [activeView, setActiveView] = useState<'books_list' | 'curriculum_view' | 'analytics_dashboard'>('books_list');
  const [booksList, setBooksList] = useState<any[]>(INITIAL_BOOKS);
  const [selectedBook, setSelectedBook] = useState<string>('sentence-builder-vol-2');

  // Curriculum Units State
  const [curriculumUnits, setCurriculumUnits] = useState<any[]>([]);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Book Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookFormData, setBookFormData] = useState({ id: '', slug: '', title: '', subtitle: '' });
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  // Unit Modal State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnitNum, setEditingUnitNum] = useState<number | null>(null);
  const [unitFormData, setUnitFormData] = useState({ unit_number: 1, title: '', subtitle: '' });

  // Exercise Modal State (CRUD Exercise)
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseModalContext, setExerciseModalContext] = useState<{ unit: any; isEditing: boolean } | null>(null);
  const [exerciseFormData, setExerciseFormData] = useState({
    exercise_code: '',
    title: '',
    exercise_type: 'translation',
    use_ai_check: true,
    instruction: '',
    guidance: '',
    order_index: 1
  });
  const [isSubmittingExercise, setIsSubmittingExercise] = useState(false);

  // Quiz Editor Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuizExercise, setCurrentQuizExercise] = useState<{
    unit: any;
    exercise: any;
  } | null>(null);
  const [quizItems, setQuizItems] = useState<any[]>([]);
  const [quizCategories, setQuizCategories] = useState<any[]>([]);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch dynamic Books List (with calculated unit counts and custom slug)
  const fetchBooksList = () => {
    fetch('/api/admin/books')
      .then(res => res.json())
      .then(resData => {
        const books = Array.isArray(resData) ? resData : (resData?.books || []);
        if (Array.isArray(books) && books.length > 0) {
          setBooksList(books);
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

  // Fetch Analytics data for selected book
  const fetchAnalytics = (bookId: string) => {
    setIsLoadingAnalytics(true);
    fetch(`/api/analytics/summary?book=${encodeURIComponent(bookId)}`)
      .then(res => res.json())
      .then(data => {
        setAnalyticsData(data);
      })
      .catch(err => console.warn('Error fetching analytics:', err))
      .finally(() => setIsLoadingAnalytics(false));
  };

  useEffect(() => {
    try {
      if (sessionStorage.getItem('admin_authenticated') === '1') {
        setIsAuthenticated(true);
      }
    } catch {}
    fetchBooksList();
  }, []);

  useEffect(() => {
    if (selectedBook && isAuthenticated) {
      fetchCurriculum(selectedBook);
      fetchAnalytics(selectedBook);
    }
  }, [selectedBook, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setIsLoggingIn(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setAuthError('');
        try {
          sessionStorage.setItem('admin_authenticated', '1');
        } catch {}
      } else {
        setAuthError(data.error || 'Passcode ไม่ถูกต้อง');
      }
    } catch {
      setAuthError('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasscode('');
    try {
      sessionStorage.removeItem('admin_authenticated');
    } catch {}
  };

  // Book Handlers
  const openCreateBookModal = () => {
    setEditingBookId(null);
    setBookFormData({ id: '', slug: '', title: '', subtitle: '' });
    setShowBookModal(true);
  };

  const openEditBookModal = (book: any) => {
    setEditingBookId(book.id);
    setBookFormData({ 
      id: book.id, 
      slug: book.slug || book.id, 
      title: book.title || '', 
      subtitle: book.subtitle || '' 
    });
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

  // Exercise Config Handlers (CRUD)
  const openAddExerciseModal = (unit: any) => {
    const nextIdx = (unit.exercises?.length || 0) + 1;
    const nextCode = `ex-${Date.now().toString().slice(-4)}`;
    setExerciseModalContext({ unit, isEditing: false });
    setExerciseFormData({
      exercise_code: nextCode,
      order_index: nextIdx,
      title: `Exercise ${nextIdx}: แบบฝึกหัดแต่งประโยค`,
      exercise_type: 'translation',
      use_ai_check: true,
      instruction: 'แปลประโยคภาษาไทยเป็นภาษาอังกฤษโดยใช้โครงสร้างที่กำหนด',
      guidance: 'ตรวจสอบ Subject-Verb Agreement และความถูกต้องของไวยากรณ์'
    });
    setShowExerciseModal(true);
  };

  const openEditExerciseModal = (unit: any, exercise: any) => {
    setExerciseModalContext({ unit, isEditing: true });
    setExerciseFormData({
      exercise_code: exercise.code,
      order_index: typeof exercise.order_index === 'number' ? exercise.order_index : 1,
      title: exercise.title || '',
      exercise_type: exercise.type || 'translation',
      use_ai_check: exercise.use_ai_check !== false,
      instruction: exercise.instruction || '',
      guidance: exercise.guidance || ''
    });
    setShowExerciseModal(true);
  };

  const handleSaveExercise = async () => {
    if (!exerciseModalContext || !exerciseFormData.title.trim()) {
      alert('กรุณากรอกชื่อแบบฝึกหัด');
      return;
    }

    setIsSubmittingExercise(true);
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_exercise',
          bookName: selectedBook,
          exerciseData: {
            unit_id: exerciseModalContext.unit.id,
            unit_number: exerciseModalContext.unit.unit_number,
            ...exerciseFormData
          }
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🎉 ${resData.message || 'บันทึกแบบฝึกหัดเรียบร้อยแล้ว!'}` });
        fetchCurriculum(selectedBook);
        setShowExerciseModal(false);
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการบันทึกแบบฝึกหัด' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSubmittingExercise(false);
    }
  };

  // Move exercise up or down in unit
  const handleReorderExercise = async (unit: any, fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    const sorted = [...(unit.exercises || [])].sort((a: any, b: any) => {
      const orderA = typeof a.order_index === 'number' ? a.order_index : (parseInt((a.code || '').replace(/\D/g, ''), 10) || 99);
      const orderB = typeof b.order_index === 'number' ? b.order_index : (parseInt((b.code || '').replace(/\D/g, ''), 10) || 99);
      return orderA - orderB;
    });

    if (toIndex < 0 || toIndex >= sorted.length) return;

    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);

    const exerciseOrders = sorted.map((ex, idx) => ({
      exercise_code: ex.code,
      order_index: idx + 1
    }));

    // Optimistically update curriculum state
    setCurriculumUnits(prev => prev.map(u => {
      if (u.id === unit.id || u.unit_number === unit.unit_number) {
        return {
          ...u,
          exercises: sorted.map((ex, idx) => ({ ...ex, order_index: idx + 1 }))
        };
      }
      return u;
    }));

    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder_exercises',
          bookName: selectedBook,
          unit_id: unit.id,
          exercise_orders: exerciseOrders
        })
      });
      if (res.ok) {
        setSaveMessage({ type: 'success', text: '🎉 บันทึกลำดับแบบฝึกหัดใหม่เรียบร้อยแล้ว!' });
      }
    } catch (err) {
      console.error('Failed to reorder exercises:', err);
      fetchCurriculum(selectedBook);
    }
  };

  const handleDeleteExercise = async (unit: any, exercise: any) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแบบฝึกหัด "${exercise.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/curriculum?action=delete_exercise&unit_id=${unit.id}&exercise_code=${exercise.code}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🗑️ ลบแบบฝึกหัด ${exercise.title} เรียบร้อยแล้ว!` });
        fetchCurriculum(selectedBook);
      } else {
        setSaveMessage({ type: 'error', text: resData.error || 'เกิดข้อผิดพลาดในการลบแบบฝึกหัด' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ' });
    }
  };

  // Quiz Editor Handlers
  const openQuizEditor = (unit: any, exercise: any) => {
    setCurrentQuizExercise({ unit, exercise });
    const rawItems = (exercise.items || []).map((item: any) => ({
      ...item,
      teacher_guidance: item.teacher_guidance || item.context_hint || item.image_description || '',
      image_description: item.image_description || item.teacher_guidance || item.context_hint || ''
    }));
    setQuizItems(JSON.parse(JSON.stringify(rawItems)));
    // Load and normalize categories for guided_sentence type (or ex-2 / existing word_bank)
    const isGuided = exercise.type === 'guided_sentence' || exercise.code === 'ex-2' || !!exercise.categories || !!exercise.word_bank;
    if (isGuided) {
      let rawCats = exercise.categories;
      if ((!rawCats || rawCats.length === 0) && exercise.word_bank) {
        if (Array.isArray(exercise.word_bank)) {
          rawCats = exercise.word_bank;
        } else if (typeof exercise.word_bank === 'object') {
          rawCats = Object.entries(exercise.word_bank).map(([key, words]: [string, any], idx) => ({
            order: idx + 1,
            name: key === 'action' ? 'กำลังทำอะไร' : key === 'purpose' ? 'เพื่ออะไร (to...)' : key === 'time' ? 'เมื่อไหร่' : key === 'reason' ? 'เพราะอะไร (because...)' : key,
            words: Array.isArray(words) ? words : []
          }));
        }
      }

      const normalizedCats = Array.isArray(rawCats) && rawCats.length > 0
        ? rawCats.map((c: any, cIdx: number) => ({
            order: c.order || cIdx + 1,
            name: c.name || c.category_name || `หมวดที่ ${c.order || cIdx + 1}`,
            words: (c.words || c.word_bank || []).map((w: any, wIdx: number) => {
              const defaultId = `${c.order || cIdx + 1}${String.fromCharCode(97 + wIdx)}`;
              if (typeof w === 'string') {
                return { id: defaultId, en: w, th: '', next_valid_ids: undefined };
              }
              return {
                id: w.id || defaultId,
                en: w.en || '',
                th: w.th || '',
                next_valid_ids: Array.isArray(w.next_valid_ids) ? w.next_valid_ids : undefined
              };
            })
          }))
        : [
            {
              order: 1,
              name: '',
              words: [{ id: '1a', en: '', th: '' }]
            }
          ];
      setQuizCategories(normalizedCats);
    } else {
      setQuizCategories([]);
    }
    setShowQuizModal(true);
  };

  // Category & Matrix Grid manipulation handlers for guided_sentence
  const maxRowCount = Math.max(1, ...quizCategories.map(c => (c.words || []).length));

  const handleToggleNextValidId = (cIdx: number, rIdx: number, targetId: string) => {
    setQuizCategories(prev => {
      const copy = [...prev];
      const wordsCopy = [...(copy[cIdx].words || [])];
      if (!wordsCopy[rIdx]) return prev;

      const curWord = wordsCopy[rIdx];
      const defaultNext = `${copy[cIdx].order + 1}${String.fromCharCode(97 + rIdx)}`;
      const curNextIds: string[] = Array.isArray(curWord.next_valid_ids) 
        ? [...curWord.next_valid_ids] 
        : [defaultNext];

      let nextList: string[];
      if (curNextIds.includes(targetId)) {
        nextList = curNextIds.filter(id => id !== targetId);
      } else {
        nextList = [...curNextIds, targetId];
      }

      wordsCopy[rIdx] = {
        ...curWord,
        next_valid_ids: nextList
      };
      copy[cIdx] = { ...copy[cIdx], words: wordsCopy };
      return copy;
    });
  };

  const handleAddMatrixSet = () => {
    setQuizCategories(prev => prev.map(cat => ({
      ...cat,
      words: [...(cat.words || []), { en: '', th: '' }]
    })));
  };

  const handleDeleteMatrixSet = (rIdx: number) => {
    setQuizCategories(prev => prev.map(cat => ({
      ...cat,
      words: (cat.words || []).filter((_: any, i: number) => i !== rIdx)
    })));
  };

  const handleAddMatrixOrder = () => {
    const nextOrder = quizCategories.length + 1;
    const currentRows = Math.max(1, ...quizCategories.map(c => (c.words || []).length));
    const newWords = Array.from({ length: currentRows }, () => ({ en: '', th: '' }));
    setQuizCategories(prev => [
      ...prev,
      {
        order: nextOrder,
        name: `หมวดที่ ${nextOrder}`,
        words: newWords
      }
    ]);
  };

  const handleDeleteMatrixOrder = (cIdx: number) => {
    setQuizCategories(prev => {
      const filtered = prev.filter((_, i) => i !== cIdx);
      return filtered.map((cat, idx) => ({ ...cat, order: idx + 1 }));
    });
  };

  const handleUpdateCategoryName = (cIdx: number, name: string) => {
    setQuizCategories(prev => {
      const copy = [...prev];
      copy[cIdx] = { ...copy[cIdx], name };
      return copy;
    });
  };

  const handleUpdateMatrixCell = (cIdx: number, rIdx: number, field: 'en' | 'th', value: string) => {
    setQuizCategories(prev => {
      const copy = [...prev];
      const wordsCopy = [...(copy[cIdx].words || [])];
      while (wordsCopy.length <= rIdx) {
        wordsCopy.push({ en: '', th: '' });
      }
      wordsCopy[rIdx] = { ...wordsCopy[rIdx], [field]: value };
      copy[cIdx] = { ...copy[cIdx], words: wordsCopy };
      return copy;
    });
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
      newItem.thai = '';
      newItem.model_answer = '';
    } else if (exType === 'guided_sentence') {
      newItem.prompt = '____________________';
      newItem.thai_template = '';
      newItem.required_orders = [1];
      newItem.model_answer = '';
    } else if (exType === 'picture_description') {
      newItem.image_description = '';
      newItem.context_hint = '';
      newItem.model_answer = '';
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

  const handleUpdatePromptSegment = (qIdx: number, segIdx: number, newText: string) => {
    setQuizItems(prev => {
      const copy = [...prev];
      const curPrompt = copy[qIdx].prompt || '';
      const blankRegex = /_{2,}/g;
      const parts = curPrompt.split(blankRegex);
      if (parts.length === 0) parts.push('');
      parts[segIdx] = newText;
      copy[qIdx] = {
        ...copy[qIdx],
        prompt: parts.join('_____________________')
      };
      return copy;
    });
  };

  const handleInsertSlotIntoPrompt = (qIdx: number, orderNum: number) => {
    setQuizItems(prev => {
      const copy = [...prev];
      const curPrompt = copy[qIdx].prompt ?? '';
      const blankRegex = /_{2,}/g;
      const parts = curPrompt ? curPrompt.split(blankRegex) : [''];
      
      // Append a new segment after the inserted blank
      parts.push('');
      const newPrompt = parts.join('_____________________');
      
      const curOrders: number[] = copy[qIdx].required_orders ? [...copy[qIdx].required_orders] : [];
      curOrders.push(orderNum);
      
      copy[qIdx] = {
        ...copy[qIdx],
        prompt: newPrompt,
        required_orders: curOrders
      };
      return copy;
    });
  };

  const handleRemoveSlotFromPrompt = (qIdx: number, slotIdx: number) => {
    setQuizItems(prev => {
      const copy = [...prev];
      const curPrompt = copy[qIdx].prompt || '';
      const blankRegex = /_{2,}/g;
      const parts = curPrompt.split(blankRegex);
      if (parts.length <= 1) return prev;

      // Merge parts[slotIdx] and parts[slotIdx + 1]
      const merged = (parts[slotIdx] || '') + (parts[slotIdx + 1] || '');
      parts.splice(slotIdx, 2, merged);

      const curOrders: number[] = copy[qIdx].required_orders ? [...copy[qIdx].required_orders] : [];
      curOrders.splice(slotIdx, 1);

      copy[qIdx] = {
        ...copy[qIdx],
        prompt: parts.join('_____________________'),
        required_orders: curOrders.length > 0 ? curOrders : [1]
      };
      return copy;
    });
  };

  const [isUploadingImage, setIsUploadingImage] = useState<Record<number, boolean>>({});

  const handleUploadImage = async (qIdx: number, file: File) => {
    if (!file) return;
    setIsUploadingImage(prev => ({ ...prev, [qIdx]: true }));
    try {
      // 1. Upload via dedicated backend API route (handles bucket creation and public CDN URL)
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });

      const resData = await res.json();
      if (res.ok && resData.publicUrl) {
        handleUpdateQuestion(qIdx, 'image_url', resData.publicUrl);
        setIsUploadingImage(prev => ({ ...prev, [qIdx]: false }));
        return;
      }

      // 2. Direct client-side Supabase storage attempt
      if (supabase) {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `ex3_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error } = await supabase.storage
          .from('exercise-images')
          .upload(fileName, file, { upsert: true });

        if (!error) {
          const { data: publicUrlData } = supabase.storage
            .from('exercise-images')
            .getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            handleUpdateQuestion(qIdx, 'image_url', publicUrlData.publicUrl);
            setIsUploadingImage(prev => ({ ...prev, [qIdx]: false }));
            return;
          }
        }
      }

      // 3. Fallback: Read as base64 data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        handleUpdateQuestion(qIdx, 'image_url', base64Url);
        setIsUploadingImage(prev => ({ ...prev, [qIdx]: false }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image upload failed:', err);
      setIsUploadingImage(prev => ({ ...prev, [qIdx]: false }));
    }
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuizItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveQuiz = async () => {
    if (!currentQuizExercise) return;
    setIsSavingQuiz(true);

    try {
      const isGuided = currentQuizExercise.exercise.type === 'guided_sentence' || currentQuizExercise.exercise.code === 'ex-2' || quizCategories.length > 0;
      const cleanedItems = quizItems.map(item => {
        const blankRegex = /_{2,}/g;
        const slotCount = Math.max(1, (item.prompt || '').match(blankRegex)?.length || 1);
        const rawOrders = Array.isArray(item.required_orders) && item.required_orders.length > 0 ? item.required_orders : [1];
        return {
          ...item,
          required_orders: rawOrders.slice(0, slotCount)
        };
      });

      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_quiz_items',
          bookName: selectedBook,
          unit_id: currentQuizExercise.unit.id,
          unit_number: currentQuizExercise.unit.unit_number,
          exercise_code: currentQuizExercise.exercise.code,
          items: cleanedItems,
          categories: isGuided ? quizCategories : undefined
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveMessage({ type: 'success', text: `🎉 บันทึกคำถามและหมวดหมู่คำศัพท์สำหรับ ${currentQuizExercise.exercise.title} เรียบร้อยแล้ว!` });
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
        <div className="login-card max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center">
          <div className="login-icon-box w-16 h-16 rounded-2xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center mx-auto mb-4 border border-[#2563eb]/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="login-title text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5 font-heading">
            Engonair Admin Login
          </h1>
          <p className="login-subtitle text-slate-500 text-sm mb-6">
            ระบบจัดการ Books, Units, Exercises & Quizzes
          </p>

          <form onSubmit={handleLogin} className="login-form space-y-4">
            <div className="login-input-group">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="login-passcode-input w-full rounded-2xl bg-slate-50 border border-slate-300 px-4 py-3.5 text-base text-slate-900 focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-center font-mono"
              />
            </div>

            {authError && (
              <p className="login-error-message text-sm text-[#dc2626] font-semibold">{authError}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="login-submit-btn w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3.5 rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>กำลังตรวจสอบรหัสผ่าน...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  <span>เข้าสู่ระบบ Engonair Admin</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer mt-6 pt-5 border-t border-slate-200">
            <Link href="/sentence-builder-vol-2" className="login-back-link text-sm text-[#2563eb] font-bold hover:underline flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
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
      <header className="admin-top-navbar h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="navbar-brand-box flex items-center gap-3">
          <div className="navbar-logo-icon w-9 h-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-xl font-heading">
            E
          </div>
          <span className="navbar-brand-text text-xl font-extrabold text-[#1e3a8a] tracking-tight font-heading">
            Engonair <span className="brand-highlight text-[#2563eb] font-bold">Admin</span>
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-red-50"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>ออกจากระบบ</span>
        </button>
      </header>

      <div className="admin-body-container flex-1 flex w-full">
        {/* ========================================================= */}
        {/* ENGONAIR ADMIN LEFT SIDEBAR */}
        {/* ========================================================= */}
        <aside className="admin-sidebar w-64 bg-white border-r border-slate-200 py-6 flex flex-col justify-between shrink-0 hidden lg:flex">
          <nav className="sidebar-nav-menu space-y-2 px-3.5">
            <button
              onClick={() => setActiveView('books_list')}
              className={`sidebar-nav-item w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeView === 'books_list' ? 'active-nav-item bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="nav-item-icon w-5 h-5" />
              <span className="nav-item-label">Books Management</span>
            </button>

            <button
              onClick={() => {
                setActiveView('analytics_dashboard');
                fetchAnalytics(selectedBook);
              }}
              className={`sidebar-nav-item w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeView === 'analytics_dashboard' ? 'active-nav-item bg-[#2563eb] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart2 className="nav-item-icon w-5 h-5" />
              <span className="nav-item-label">Tracking & Analytics</span>
            </button>

            {activeView === 'curriculum_view' && (
              <button
                className="sidebar-nav-item active-nav-item w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer bg-[#2563eb] text-white shadow-xs"
              >
                <Layers className="nav-item-icon w-5 h-5" />
                <span className="nav-item-label">Units & Exercises</span>
              </button>
            )}
          </nav>

          <div className="sidebar-footer-box px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            <span className="system-version-tag">Sentence Builder Advisor v2.0</span>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENT WORKSPACE (FULL WIDTH CONTAINER) */}
        {/* ========================================================= */}
        <main className="admin-main-content flex-1 w-full p-6 lg:p-8">
          {/* Toast Notification */}
          {saveMessage && (
            <div className={`admin-toast-alert mb-6 p-4 rounded-2xl text-sm font-bold border flex items-center justify-between shadow-xs ${
              saveMessage.type === 'success' 
                ? 'toast-success bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'toast-error bg-red-50 text-red-800 border-red-200'
            }`}>
              <div className="toast-content flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
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
                  <h1 className="section-main-heading text-3xl font-extrabold text-slate-900 font-heading">
                    Books Management
                  </h1>
                  <p className="section-description text-slate-500 text-sm mt-1">
                    จัดการรายการหนังสือ, Custom URL Slug สำหรับสร้าง QR Code และจัดการ Units
                  </p>
                </div>

                <button
                  onClick={openCreateBookModal}
                  className="btn-create-new-book bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-md flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  <span>+ Create New Book</span>
                </button>
              </div>

              <div className="books-table-card w-full bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="table-responsive-wrapper w-full overflow-x-auto">
                  <table className="crud-books-table w-full text-left border-collapse">
                    <thead>
                      <tr className="table-header-row bg-slate-50 border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="th-title py-4.5 px-6 w-5/12">Title</th>
                        <th className="th-slug py-4.5 px-4 w-3/12">URL Slug & QR Code</th>
                        <th className="th-units py-4.5 px-4 w-2/12">Units</th>
                        <th className="th-actions py-4.5 px-6 text-right w-2/12">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="table-body-rows divide-y divide-slate-100 text-sm font-medium text-slate-700">
                      {booksList.map((book) => {
                        const unitsCount = book.total_units || 0;
                        const bookSlug = book.slug || book.id;
                        return (
                          <tr key={book.id} className="book-item-row hover:bg-slate-50/80 transition-colors">
                            {/* Title & Subtitle */}
                            <td className="td-title-cell py-5 px-6">
                              <div className="book-title-container flex items-center gap-3.5">
                                <div className="book-thumbnail-box w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-[#2563eb] flex items-center justify-center font-bold shrink-0">
                                  <BookMarked className="w-6 h-6" />
                                </div>
                                <div className="book-info-box">
                                  <div className="book-name-text font-extrabold text-slate-900 text-base line-clamp-1">
                                    {book.title}
                                  </div>
                                  <div className="book-subtitle-text text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                                    {book.subtitle}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Slug Column with QR Link */}
                            <td className="td-slug-cell py-5 px-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm text-[#2563eb] font-bold">
                                  <Link2 className="w-4 h-4 shrink-0" />
                                  <span className="bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                                    /{bookSlug}
                                  </span>
                                </div>
                                <Link 
                                  href={`/${bookSlug}`} 
                                  target="_blank"
                                  className="text-xs text-slate-400 hover:text-[#2563eb] flex items-center gap-1 font-medium transition-colors"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Preview / QR Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                            </td>

                            {/* Units count */}
                            <td className="td-units-cell py-5 px-4">
                              <span className="units-count-pill inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100">
                                {unitsCount} {unitsCount === 1 ? 'Unit' : 'Units'}
                              </span>
                            </td>

                             {/* Actions Toolbar */}
                            <td className="td-actions-cell py-5 px-6 text-right">
                              <div className="actions-button-group flex items-center justify-end gap-2.5">
                                <button
                                  onClick={() => openEditBookModal(book)}
                                  title="แก้ไขข้อมูลหนังสือ / URL Slug"
                                  className="btn-edit-book p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4.5 h-4.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedBook(book.id);
                                    setActiveView('analytics_dashboard');
                                    fetchAnalytics(book.id);
                                  }}
                                  title="ดูสถิติผู้เข้าเรียน & QR Tracking"
                                  className="btn-view-analytics px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <BarChart2 className="w-4 h-4" />
                                  <span>สถิติ</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedBook(book.id);
                                    setActiveView('curriculum_view');
                                  }}
                                  title="เข้าสู่หน้าจัดการ Units & เฉลย"
                                  className="btn-manage-units px-3.5 py-2 rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Layers className="w-4 h-4" />
                                  <span>Units & เฉลย</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteBook(book.id, book.title)}
                                  disabled={deletingBookId === book.id}
                                  title="ลบหนังสือ"
                                  className="btn-delete-book p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                >
                                  {deletingBookId === book.id ? (
                                    <RefreshCw className="w-4.5 h-4.5 animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 className="w-4.5 h-4.5" />
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
          {/* LEVEL 3: TRACKING & ANALYTICS DASHBOARD VIEW */}
          {/* ========================================================= */}
          {activeView === 'analytics_dashboard' && (
            <section className="analytics-dashboard-section w-full">
              {/* Top Navigation / Breadcrumb */}
              <div className="back-navigation-bar mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  onClick={() => setActiveView('books_list')}
                  className="btn-back-to-books inline-flex items-center gap-1.5 text-sm font-bold text-[#2563eb] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                  <span>← กลับหน้ารายการหนังสือ (Books Management)</span>
                </button>

                <div className="flex items-center gap-3">
                  {/* Book Selector Dropdown */}
                  <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <select
                      value={selectedBook}
                      onChange={(e) => {
                        setSelectedBook(e.target.value);
                        fetchAnalytics(e.target.value);
                      }}
                      className="text-xs sm:text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-2"
                    >
                      {booksList.map(b => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Test Scan Button */}
                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/analytics/track', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'book', bookName: selectedBook })
                        });
                        fetchAnalytics(selectedBook);
                      } catch (e) {
                        console.error('Test scan error:', e);
                      }
                    }}
                    title="จำลองการสแกน QR Code เพื่อทดสอบการนับสถิติจริง"
                    className="p-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl border border-purple-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ทดสอบ Scan (+1)</span>
                  </button>

                  {/* Test AI Check Button */}
                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/analytics/track', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'check', bookName: selectedBook, unitNumber: 1, isCorrect: true })
                        });
                        fetchAnalytics(selectedBook);
                      } catch (e) {
                        console.error('Test AI check error:', e);
                      }
                    }}
                    title="จำลองการส่งตรวจ AI (+1) เพื่อทดสอบสถิติ AI Checks และ Accuracy"
                    className="p-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl border border-indigo-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>ทดสอบ AI Check (+1)</span>
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchAnalytics(selectedBook)}
                    disabled={isLoadingAnalytics}
                    className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin text-blue-600' : ''}`} />
                    <span className="hidden sm:inline">รีเฟรช</span>
                  </button>
                </div>
              </div>

              {/* Dashboard Header */}
              <div className="dashboard-header-card bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-xs font-extrabold">
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>Tracking & Learning Analytics</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>บันทึกข้อมูลการใช้งานจริง (Live Tracking Active)</span>
                      </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                      {activeBookObj.title}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                      {activeBookObj.subtitle} • URL: <span className="font-mono text-blue-600 font-bold">/{activeBookObj.slug || activeBookObj.id}</span>
                    </p>
                  </div>

                  <Link
                    href={`/${activeBookObj.slug || activeBookObj.id}`}
                    target="_blank"
                    className="self-start md:self-auto px-4 py-2.5 rounded-2xl bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>เปิดดูหน้าสารบัญจริง</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 6 KPI Metrics Grid */}
              <div className="kpi-metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {/* Metric 1: Total QR Scans */}
                <div className="kpi-card bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total QR Scans</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold">
                      <QrCode className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                    {analyticsData?.totalQrScans?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="text-blue-600 font-bold">● สแกนหลังปก</span> จาก QR Code ทั้งหมด
                  </div>
                </div>

                {/* Metric 2: Unit 1 Readers */}
                <div className="kpi-card bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit 1 Readers</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                    {analyticsData?.unit1Views?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="text-emerald-600 font-bold">● เริ่มเรียน</span> เปิดเข้าอ่านบทที่ 1
                  </div>
                </div>

                {/* Metric 3: QR to Unit 1 Conversion */}
                <div className="kpi-card bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">QR ➔ Unit 1</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                    {analyticsData?.qrToUnit1Conversion || 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="text-purple-600 font-bold">Conversion Rate</span> สแกนแล้วกดเริ่มทำ
                  </div>
                </div>

                {/* Metric 4: Course Completion */}
                <div className="kpi-card bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completion Rate</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                    {analyticsData?.courseCompletionRate || 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="text-amber-600 font-bold">● สำเร็จการเรียน</span> ทำครบถึงบทสุดท้าย
                  </div>
                </div>

                {/* Metric 5: Total AI Checks */}
                <div className="kpi-card bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Checks</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Bot className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                    {analyticsData?.totalAiChecks?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="text-indigo-600 font-bold">● ตรวจข้อสอบ</span> ส่งตรวจด้วย AI
                  </div>
                </div>

                {/* Metric 6: Accuracy Rate */}
                <div className="kpi-card bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Accuracy</span>
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                    {analyticsData?.accuracyRate || 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="text-teal-600 font-bold">● อัตราตอบถูก</span> โครงสร้างประโยค
                  </div>
                </div>
              </div>

              {/* Unit 1 - 30 Visual Learning Funnel */}
              <div className="funnel-chart-card bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#2563eb]" />
                      <span>Unit 1 - 30 Learning Funnel & Drop-off</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      สถิติจำนวนผู้เข้าเรียนในแต่ละบท เพื่อดูว่านักเรียนติดขัดหรือ Drop-off ในบทใด
                    </p>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto">
                    30 Units Total
                  </span>
                </div>

                {/* Visual Bar Funnel */}
                <div className="funnel-bars-container space-y-3">
                  {analyticsData?.unitViews?.map((u: any) => {
                    const maxViews = analyticsData?.unit1Views || 0;
                    const pct = (maxViews > 0 && u.view_count > 0)
                      ? Math.min(100, Math.round((u.view_count / maxViews) * 100))
                      : 0;
                    const isUnit1 = u.unit_number === 1;
                    const isUnit15 = u.unit_number === 15;
                    const isUnit30 = u.unit_number === 30;

                    return (
                      <div key={u.unit_number} className="funnel-row flex items-center gap-3 text-xs sm:text-sm group">
                        {/* Unit Label */}
                        <div className="unit-label-box w-20 sm:w-24 shrink-0 font-bold text-slate-700 flex items-center gap-1.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                            isUnit1 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isUnit30 
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.unit_number}
                          </span>
                          <span>Unit {u.unit_number}</span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="bar-track flex-1 h-7 bg-slate-100 rounded-xl overflow-hidden relative flex items-center p-1">
                          {pct > 0 && (
                            <div
                              style={{ width: `${pct}%` }}
                              className={`bar-fill h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2 ${
                                isUnit1 
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                  : isUnit30 
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                  : 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6]'
                              }`}
                            >
                              {pct > 15 && (
                                <span className="text-[11px] font-extrabold text-white drop-shadow-xs">
                                  {u.view_count?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}

                          {pct <= 15 && (
                            <span className={`text-[11px] font-bold pl-2 ${u.view_count === 0 ? 'text-slate-400' : 'text-slate-600'}`}>
                              {u.view_count?.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Retention % */}
                        <div className={`retention-pct-box w-14 sm:w-16 shrink-0 text-right font-mono font-bold text-xs ${pct === 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                          {pct}%
                        </div>

                        {/* Quick Link to Unit */}
                        <Link
                          href={`/${activeBookObj.slug || activeBookObj.id}/chapter-${u.unit_number}`}
                          target="_blank"
                          title={`เปิดดู Unit ${u.unit_number}`}
                          className="text-slate-400 hover:text-[#2563eb] p-1 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  })}
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
                  className="btn-back-to-books inline-flex items-center gap-1.5 text-sm font-bold text-[#2563eb] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                  <span>← Back to Books Management</span>
                </button>

                <Link
                  href={`/${activeBookObj.slug || activeBookObj.id}`}
                  target="_blank"
                  className="btn-preview-book text-sm px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 shadow-2xs transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ดูหน้าหนังสือจริง (/{activeBookObj.slug || activeBookObj.id})</span>
                </Link>
              </div>

              {/* CURRICULUM TOP HEADER */}
              <div className="curriculum-top-header flex items-center justify-between mb-6 pb-2">
                <div className="curriculum-title-container flex items-center gap-3.5">
                  <Layers className="w-7 h-7 text-[#2563eb]" />
                  <div>
                    <h1 className="curriculum-main-title text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                      Units & Exercises Management
                    </h1>
                    <p className="curriculum-subtitle text-sm text-slate-500 mt-0.5">
                      {activeBookObj.title} ({curriculumUnits.length} Units) • Slug: <span className="font-mono text-[#2563eb]">/{activeBookObj.slug || activeBookObj.id}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={openAddUnitModal}
                  className="btn-add-unit bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4.5 py-2.5 rounded-2xl text-sm font-bold shadow-2xs flex items-center gap-2 cursor-pointer transition-all hover:border-slate-400"
                >
                  <Plus className="w-4.5 h-4.5 text-[#2563eb]" />
                  <span>+ Add Unit</span>
                </button>
              </div>

              {/* UNITS & EXERCISES LIST CONTAINER */}
              {isLoadingCurriculum ? (
                <div className="loading-state py-12 text-center text-slate-400 text-sm font-bold flex flex-col items-center gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-[#2563eb]" />
                  <span>กำลังโหลดข้อมูล Units จากฐานข้อมูล...</span>
                </div>
              ) : curriculumUnits.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700 text-base">ยังไม่มี Unit ในหนังสือเล่มนี้</h3>
                  <p className="text-slate-400 text-sm mt-1 mb-4">คลิกปุ่มด้านล่างเพื่อเริ่มสร้าง Unit แรก</p>
                  <button
                    onClick={openAddUnitModal}
                    className="bg-[#2563eb] text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md cursor-pointer hover:bg-[#1d4ed8]"
                  >
                    + Add First Unit
                  </button>
                </div>
              ) : (
                <div className="curriculum-units-list space-y-5">
                  {curriculumUnits.map((unit) => (
                    <div 
                      key={unit.unit_number} 
                      className="unit-card bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
                    >
                      {/* UNIT HEADER ROW */}
                      <div className="unit-header-row p-5 sm:px-7 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-4">
                        <div className="unit-info-box flex items-center gap-3.5">
                          <GripVertical className="unit-drag-handle w-5 h-5 text-slate-400 cursor-grab" />
                          <div className="unit-title-group">
                            <h2 className="unit-title-text font-extrabold text-slate-900 text-base sm:text-lg">
                              Unit {unit.unit_number}: {unit.title}
                            </h2>
                            {unit.subtitle && (
                              <p className="unit-subtitle-text text-xs sm:text-sm text-slate-500 mt-0.5">
                                {unit.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* UNIT ACTION TOOLBAR */}
                        <div className="unit-action-toolbar flex items-center gap-2 text-slate-500">
                          <button
                            onClick={() => openAddExerciseModal(unit)}
                            title="Add Exercise to this Unit"
                            className="btn-add-exercise-to-unit px-3 py-1.5 bg-white hover:bg-blue-50 text-[#2563eb] border border-blue-200 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Exercise</span>
                          </button>

                          <button
                            onClick={() => openEditUnitModal(unit)}
                            title="Edit Unit Info"
                            className="btn-edit-unit p-2 hover:bg-slate-200/60 rounded-xl text-slate-600 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUnit(unit.unit_number, unit.title)}
                            title="Delete Unit"
                            className="btn-delete-unit p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>

                      {/* NESTED EXERCISES LIST */}
                      <div className="unit-exercises-container p-4 sm:px-7 space-y-3">
                        {unit.exercises && unit.exercises.length > 0 ? (
                          [...unit.exercises]
                            .sort((a: any, b: any) => {
                              const orderA = typeof a.order_index === 'number' ? a.order_index : (parseInt((a.code || '').replace(/\D/g, ''), 10) || 99);
                              const orderB = typeof b.order_index === 'number' ? b.order_index : (parseInt((b.code || '').replace(/\D/g, ''), 10) || 99);
                              if (orderA !== orderB) return orderA - orderB;
                              return (a.code || '').localeCompare(b.code || '');
                            })
                            .map((exercise: any, exIdx: number, allExs: any[]) => (
                            <div
                              key={exercise.code || exIdx}
                              className="exercise-item-row bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-blue-300 hover:shadow-2xs transition-all"
                            >
                              <div className="exercise-main-content flex items-center gap-3 min-w-0">
                                {/* Move Up / Move Down Reordering Controls */}
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={exIdx === 0}
                                    onClick={() => handleReorderExercise(unit, exIdx, 'up')}
                                    className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="เลื่อนขึ้น (Move Up)"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={exIdx === allExs.length - 1}
                                    onClick={() => handleReorderExercise(unit, exIdx, 'down')}
                                    className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="เลื่อนลง (Move Down)"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                
                                <div className="exercise-icon-badge w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold shrink-0 relative">
                                  {exercise.type === 'translation' && <FileText className="w-5 h-5" />}
                                  {exercise.type === 'guided_sentence' && <Sparkles className="w-5 h-5" />}
                                  {exercise.type === 'picture_description' && <ImageIcon className="w-5 h-5" />}
                                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#1e3a8a] text-white rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                                    {exIdx + 1}
                                  </span>
                                </div>

                                <div className="exercise-title-box truncate">
                                  <div className="flex items-center gap-2">
                                    <span className="exercise-title-text font-bold text-slate-800 text-sm sm:text-base truncate block">
                                      {exercise.title}
                                    </span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                      {exercise.type === 'translation' ? '📌 Fix Answer' : exercise.type === 'guided_sentence' ? '🧩 Choose Word' : '🖼️ Describe Image'}
                                    </span>
                                  </div>
                                  {exercise.instruction && (
                                    <span className="exercise-instruction-preview text-xs text-slate-400 truncate block mt-0.5">
                                      {exercise.instruction}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* EXERCISE BADGES & ACTION BUTTONS */}
                              <div className="exercise-right-actions flex items-center gap-3 shrink-0">
                                {exercise.use_ai_check && (
                                  <span className="ai-badge text-xs font-extrabold px-3 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-1.5">
                                    <Bot className="w-3.5 h-3.5" />
                                    <span>AI Check</span>
                                  </span>
                                )}

                                <span className="exercise-item-count-badge text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {exercise.itemCount || (exercise.items ? exercise.items.length : 0)} Questions
                                </span>

                                <div className="exercise-actions-toolbar flex items-center gap-1.5 pl-2 border-l border-slate-100">
                                  <button
                                    onClick={() => openEditExerciseModal(unit, exercise)}
                                    title="Edit Exercise Config (Title, AI Check, Type, Guidance)"
                                    className="btn-edit-exercise-config p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                  >
                                    <Sliders className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => openQuizEditor(unit, exercise)}
                                    title="Manage Quiz & Questions"
                                    className="btn-edit-quiz px-3 py-1.5 bg-blue-50 hover:bg-[#2563eb] text-[#2563eb] hover:text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-xs sm:text-sm"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>จัดการเฉลย/ข้อ</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteExercise(unit, exercise)}
                                    title="Delete Exercise"
                                    className="btn-delete-exercise p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                            ยังไม่มีแบบฝึกหัดใน Unit นี้ คลิก &quot;Add Exercise&quot; เพื่อสร้าง
                          </div>
                        )}
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
      {/* EXERCISE CONFIG MODAL (CREATE / EDIT EXERCISE) */}
      {/* ========================================================= */}
      {showExerciseModal && exerciseModalContext && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="modal-content-card bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="modal-header flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
              <div>
                <span className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">
                  Unit {exerciseModalContext.unit.unit_number}: {exerciseModalContext.unit.title}
                </span>
                <h3 className="modal-title text-xl font-bold text-slate-900 font-heading mt-1">
                  {exerciseModalContext.isEditing ? '📝 แก้ไขการตั้งค่าแบบฝึกหัด' : '➕ สร้างแบบฝึกหัดใหม่ (Add Exercise)'}
                </h3>
              </div>
              <button onClick={() => setShowExerciseModal(false)} className="modal-close-btn text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="modal-form-body space-y-4.5 text-sm">
              {/* Exercise Title */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  ชื่อแบบฝึกหัด (Exercise Title):
                </label>
                <input
                  type="text"
                  value={exerciseFormData.title}
                  onChange={(e) => setExerciseFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น Exercise 1: แปลประโยคภาษาอังกฤษ"
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              {/* Exercise Order Index */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  ลำดับการแสดงผลใน Unit (Display Order):
                </label>
                <input
                  type="number"
                  min="1"
                  value={exerciseFormData.order_index}
                  onChange={(e) => setExerciseFormData(prev => ({ ...prev, order_index: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              {/* Exercise Type */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  ประเภทแบบฝึกหัด (Exercise Type):
                </label>
                <select
                  value={exerciseFormData.exercise_type}
                  onChange={(e) => setExerciseFormData(prev => ({ ...prev, exercise_type: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="translation">📌 Fix Answer / Translation (แปลประโยคภาษาอังกฤษ)</option>
                  <option value="guided_sentence">🧩 Choose Provided Word (เลือกคำที่กำหนดให้มาแต่งประโยค)</option>
                  <option value="picture_description">🖼️ Describe Image (ดูภาพแล้วแต่งประโยค Core + Context + Connect)</option>
                </select>
              </div>

              {/* AI Check Toggle */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-purple-900 text-sm">ตรวจคำตอบด้วย AI (Use AI to check answer)</div>
                    <div className="text-xs text-purple-700">เปิดให้ AI ช่วยวิเคราะห์ไวยากรณ์และให้คำแนะนำแบบละเอียด</div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exerciseFormData.use_ai_check}
                    onChange={(e) => setExerciseFormData(prev => ({ ...prev, use_ai_check: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-[#2563eb]"></div>
                </label>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  📌 คำแนะนำจากครูหวาน (Description / Instruction for students):
                </label>
                <textarea
                  rows={2}
                  value={exerciseFormData.instruction}
                  onChange={(e) => setExerciseFormData(prev => ({ ...prev, instruction: e.target.value }))}
                  placeholder="เช่น โปรดใช้คำศัพท์จาก Unit นี้ในหนังสือ Sentence Builder 2 ในการตอบนะคะ..."
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              {/* Teacher / AI Guidance */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  เกณฑ์การตรวจและคำแนะนำ (Teacher / AI Guidance):
                </label>
                <textarea
                  rows={2}
                  value={exerciseFormData.guidance}
                  onChange={(e) => setExerciseFormData(prev => ({ ...prev, guidance: e.target.value }))}
                  placeholder="เช่น ตรวจสอบ Subject-Verb Agreement, การเติม -ing และคำเชื่อมประโยค"
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <div className="modal-footer flex justify-end gap-3 mt-6 border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowExerciseModal(false)}
                className="btn-modal-cancel px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-200"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleSaveExercise}
                disabled={isSubmittingExercise}
                className="btn-modal-submit px-6 py-2.5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer shadow-md"
              >
                {isSubmittingExercise ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>บันทึกแบบฝึกหัด</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LEVEL 3: QUIZ / QUESTION ITEMS MANAGER MODAL */}
      {/* ========================================================= */}
      {showQuizModal && currentQuizExercise && (
        <div className="quiz-modal-backdrop fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="quiz-modal-card bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="quiz-modal-header p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-[#2563eb] uppercase tracking-wider">
                  Unit {currentQuizExercise.unit.unit_number}: {currentQuizExercise.unit.title}
                </div>
                <h3 className="quiz-modal-heading text-xl font-bold text-slate-900 font-heading mt-1">
                  📝 {currentQuizExercise.exercise.title} (Quiz Questions Manager)
                </h3>
              </div>
              <button onClick={() => setShowQuizModal(false)} className="modal-close-btn text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            {/* Modal Questions Body */}
            <div className="quiz-modal-body flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-sm">
              {/* ========================================================= */}
              {/* SECTION 1: WORD BANK COHERENT SETS MATRIX (guided_sentence) */}
              {/* ========================================================= */}
              {currentQuizExercise.exercise.type === 'guided_sentence' && (
                <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-3xl p-5 sm:p-6 mb-8 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-blue-200/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🗂️</span>
                        <h4 className="font-extrabold text-[#1e3a8a] text-base sm:text-lg font-heading">
                          1. ตารางจัดชุดคำศัพท์ที่เข้าคู่กัน (Coherent Word Sets Matrix)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        💡 <b>คำอธิบายการจับคู่:</b> คำศัพท์ใน <b>"แถวเดียวกัน (ชุดเดียวกัน)"</b> จะถือเป็นคู่คำที่มีความหมายเชื่อมโยงกันอย่างสมบูรณ์
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddMatrixSet}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ เพิ่มชุดคำใหม่ (แถว)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddMatrixOrder}
                        className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ เพิ่ม Order ใหม่ (คอลัมน์)</span>
                      </button>
                    </div>
                  </div>

                  {/* Word Bank Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-blue-200 bg-white/60">
                          <th className="p-2.5 text-xs font-bold text-slate-500 w-12 text-center">ชุดที่</th>
                          {quizCategories.map((cat, cIdx) => (
                            <th key={cat.order || cIdx} className="p-2.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-6 h-6 rounded-lg bg-[#2563eb] text-white font-extrabold text-xs flex items-center justify-center">
                                    {cat.order}
                                  </span>
                                  <input
                                    type="text"
                                    value={cat.name}
                                    onChange={(e) => handleUpdateCategoryName(cIdx, e.target.value)}
                                    placeholder={`Order ${cat.order} Name`}
                                    className="text-xs sm:text-sm font-bold text-[#1e3a8a] bg-transparent border-b border-blue-300 focus:border-blue-600 focus:outline-none px-1 py-0.5"
                                  />
                                </div>
                                {quizCategories.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMatrixOrder(cIdx)}
                                    className="text-slate-300 hover:text-red-500 text-xs p-1"
                                    title={`ลบ Order ${cat.order}`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="p-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {Array.from({ length: maxRowCount }).map((_, rIdx) => {
                          const setLetter = String.fromCharCode(97 + rIdx);
                          return (
                            <tr key={rIdx} className="hover:bg-blue-50/50 transition-colors">
                              <td className="p-2 text-center">
                                <span className="w-7 h-7 rounded-lg bg-white border border-blue-200 font-extrabold text-blue-800 text-xs inline-flex items-center justify-center shadow-2xs">
                                  {setLetter}
                                </span>
                              </td>
                              {quizCategories.map((cat, cIdx) => {
                                const wordObj = cat.words && cat.words[rIdx] ? cat.words[rIdx] : { id: `${cat.order}${setLetter}`, en: '', th: '' };
                                return (
                                  <td key={cIdx} className="p-2">
                                    <div className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-blue-200 shadow-2xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {wordObj.id}
                                        </span>
                                        <input
                                          type="text"
                                          value={wordObj.en || ''}
                                          onChange={(e) => handleUpdateMatrixCell(cIdx, rIdx, 'en', e.target.value)}
                                          placeholder="คำภาษาอังกฤษ (EN)"
                                          className="text-xs font-bold font-mono text-slate-900 w-full focus:outline-none"
                                        />
                                      </div>
                                      <input
                                        type="text"
                                        value={wordObj.th || ''}
                                        onChange={(e) => handleUpdateMatrixCell(cIdx, rIdx, 'th', e.target.value)}
                                        placeholder="คำแปลไทย (TH)"
                                        className="text-[11px] text-slate-500 w-full focus:outline-none border-t border-slate-100 pt-1"
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="p-2 text-center">
                                {maxRowCount > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMatrixSet(rIdx)}
                                    className="text-slate-300 hover:text-red-500 p-1"
                                    title="ลบชุดคำนี้"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SECTION 2: QUIZ QUESTIONS LIST */}
              {/* ========================================================= */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <h4 className="font-extrabold text-[#1e3a8a] text-base sm:text-lg font-heading">
                      {currentQuizExercise.exercise.type === 'guided_sentence'
                        ? '2. รายการโจทย์ข้อสอบและโครงสร้างคำแปล (Quiz Questions & Thai Template)'
                        : `รายการข้อสอบ/คำถาม (${quizItems.length} ข้อ)`}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="btn-add-question-item bg-blue-50 text-[#2563eb] hover:bg-[#2563eb] hover:text-white px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ เพิ่มข้อใหม่</span>
                  </button>
                </div>

                {quizItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-2xl text-sm">
                    ยังไม่มีคำถามในแบบฝึกหัดนี้ คลิก &quot;+ เพิ่มข้อใหม่&quot; เพื่อสร้างข้อสอบ
                  </div>
                ) : (
                  <div className="space-y-6">
                    {quizItems.map((q, idx) => {
                      const requiredOrders: number[] = q.required_orders || [1];

                      // Compute dynamic live translation preview for this question
                      let livePreview = '';
                      if (q.thai_template && quizCategories.length > 0) {
                        let tpl = q.thai_template;
                        for (const ord of requiredOrders) {
                          const cat = quizCategories.find(c => c.order === ord);
                          const firstWordTh = cat?.words[0]?.th || cat?.name || `[Order ${ord}]`;
                          tpl = tpl.replace(new RegExp(`\\{${ord}\\}`, 'g'), firstWordTh);
                        }
                        livePreview = tpl;
                      }

                      return (
                        <div key={idx} className="quiz-item-box bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-2xs relative">
                          <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-3">
                            <div className="font-extrabold text-[#1e3a8a] text-base sm:text-lg">
                              ข้อที่ {idx + 1}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(idx)}
                              className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors"
                              title="ลบข้อนี้"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            {/* Translation Prompt */}
                            {currentQuizExercise.exercise.type === 'translation' && (
                              <div>
                                <label className="block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                                  📍 โจทย์ภาษาไทย:
                                </label>
                                <input
                                  type="text"
                                  value={q.thai || q.thai_prompt || ''}
                                  onChange={(e) => handleUpdateQuestion(idx, 'thai', e.target.value)}
                                  placeholder="เช่น ฉันกำลังเดินทางเพื่อกลับบ้าน"
                                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#2563eb]"
                                />
                              </div>
                            )}

                            {/* Guided Sentence Prompt */}
                            {currentQuizExercise.exercise.type === 'guided_sentence' && (
                              <>
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="block font-bold text-slate-700 uppercase text-xs sm:text-sm">
                                      📍 ตัวแต่งโจทย์ข้อความ (INTERACTIVE SENTENCE BUILDER):
                                    </label>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      💡 พิมพ์ข้อความในช่อง แล้วคลิกปุ่ม Order ด้านล่างเพื่อแทรกกล่องคำตอบ
                                    </span>
                                  </div>

                                  {/* Visual Typable Interactive Sentence Builder */}
                                  <div className="bg-blue-50/70 border-2 border-blue-200/90 rounded-2xl p-4 shadow-2xs">
                                    <div className="inline-flex items-center gap-2 flex-wrap bg-white p-3 rounded-xl border border-blue-200 text-sm font-bold text-slate-900 shadow-2xs w-full min-h-[56px]">
                                      {(() => {
                                        const blankRegex = /_{2,}/g;
                                        const rawPrompt = q.prompt ?? '';
                                        const parts = rawPrompt.split(blankRegex);
                                        if (parts.length === 0) parts.push('');
                                        const totalSlots = Math.max(0, parts.length - 1);
                                        const reqOrders = q.required_orders || [];

                                        return parts.map((part: string, pIdx: number) => {
                                          const slotOrderNum = reqOrders[pIdx];
                                          const slotCat = quizCategories.find(c => c.order === slotOrderNum);
                                          const catLabel = slotCat ? slotCat.name : (slotOrderNum ? `หมวดที่ ${slotOrderNum}` : `หมวดที่ ${pIdx + 1}`);

                                          return (
                                            <div key={pIdx} className="inline-flex items-center gap-1.5 flex-wrap">
                                              {/* Typable Segment */}
                                              <input
                                                type="text"
                                                value={part}
                                                onChange={(e) => handleUpdatePromptSegment(idx, pIdx, e.target.value)}
                                                placeholder={pIdx === 0 && parts.length === 1 ? "พิมพ์ข้อความ เช่น I do " : "..."}
                                                style={{ width: `${Math.max(45, (part.length + 2) * 9)}px` }}
                                                className="font-mono text-[#1e3a8a] font-bold bg-slate-50 hover:bg-blue-50/60 focus:bg-white border-b-2 border-slate-300 focus:border-blue-600 px-2 py-1 text-sm outline-none rounded-t transition-all min-w-[50px]"
                                              />

                                              {/* Slot Badge with Delete (X) */}
                                              {pIdx < totalSlots && (
                                                <span className="relative inline-flex items-center justify-center pl-3 pr-7 py-1 border-2 border-dashed rounded-lg text-xs font-bold border-blue-400 bg-blue-50 text-[#1e3a8a] shadow-2xs select-none">
                                                  <span>({catLabel})</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemoveSlotFromPrompt(idx, pIdx)}
                                                    title="ลบช่องว่างนี้ออกจากโจทย์"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                                                  >
                                                    ✕
                                                  </button>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                </div>

                                {/* Order Buttons for Insertion */}
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="block font-bold text-slate-700 uppercase text-xs sm:text-sm">
                                      🔀 คลิกเพื่อแทรกกล่องคำศัพท์ลงในโจทย์ (CLICK TO INSERT ORDER SLOT):
                                    </label>
                                    <span className="text-[11px] text-blue-700 font-medium">
                                      แตะปุ่มเพื่อแทรกกล่องคำศัพท์ต่อท้ายข้อความ
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {quizCategories.map((cat) => {
                                      return (
                                        <button
                                          key={cat.order}
                                          type="button"
                                          onClick={() => handleInsertSlotIntoPrompt(idx, cat.order)}
                                          className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-blue-700 active:scale-95"
                                          title={`คลิกเพื่อแทรกกล่อง Order ${cat.order}: ${cat.name}`}
                                        >
                                          <span className="w-4 h-4 rounded-full bg-white/20 inline-flex items-center justify-center text-[10px] font-bold">
                                            +
                                          </span>
                                          <span>Order {cat.order}: {cat.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Thai Translation Template */}
                                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-2">
                                  <label className="block font-bold text-emerald-950 uppercase text-xs sm:text-sm">
                                    📖 โครงสร้างคำแปลภาษาไทย (Thai Translation Template):
                                  </label>
                                  <input
                                    type="text"
                                    value={q.thai_template || ''}
                                    onChange={(e) => handleUpdateQuestion(idx, 'thai_template', e.target.value)}
                                    placeholder="เช่น ฉัน{1}จริง ๆ เพื่อ{2} แม้ว่าฉันจะ{3}ก็ตาม"
                                    className="w-full rounded-xl bg-white border border-emerald-300 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-950 focus:outline-none focus:border-emerald-600"
                                  />
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-800">
                                    <span className="font-semibold">💡 ตัวแปรที่ใช้ได้:</span>
                                    {quizCategories.map(c => (
                                      <span key={c.order} className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold">
                                        {`{${c.order}}`} = {c.name}
                                      </span>
                                    ))}
                                  </div>

                                  {livePreview && (
                                    <div className="pt-2 border-t border-emerald-200/60 text-xs text-emerald-900">
                                      <span className="font-bold">ตัวอย่างคำแปลเมื่อตอบถูก:</span>{' '}
                                      <span className="font-medium bg-white/90 px-2 py-0.5 rounded border border-emerald-300">
                                        "{livePreview}"
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Live Auto-Generated Answers Matrix Preview for this question */}
                                {(() => {
                                  const blankRegex = /_{2,}/g;
                                  const promptParts = (q.prompt || '').split(blankRegex);
                                  const slotCount = Math.max(1, (q.prompt || '').match(blankRegex)?.length || 1);
                                  const allSolutions: Array<{ en: string; th: string }> = [];
                                  const seenEnSolutions = new Set<string>();

                                  for (let r = 0; r < maxRowCount; r++) {
                                    const chosenEnWords: string[] = [];
                                    const chosenThWords: Record<number, string> = {};

                                    for (const ord of requiredOrders) {
                                      const cat = quizCategories.find(c => c.order === ord);
                                      const wObj = cat?.words && cat.words[r];
                                      if (wObj && wObj.en) {
                                        chosenEnWords.push(wObj.en);
                                        chosenThWords[ord] = wObj.th || wObj.en;
                                      }
                                    }

                                    if (chosenEnWords.length === slotCount) {
                                      let enSentence = '';
                                      promptParts.forEach((part: string, pIdx: number) => {
                                        enSentence += part;
                                        if (pIdx < chosenEnWords.length) {
                                          enSentence += chosenEnWords[pIdx];
                                        }
                                      });

                                      const normalizedKey = enSentence.trim().toLowerCase();
                                      if (!seenEnSolutions.has(normalizedKey)) {
                                        seenEnSolutions.add(normalizedKey);

                                        let thSentence = '';
                                        if (q.thai_template) {
                                          let tpl = q.thai_template;
                                          for (const ord of requiredOrders) {
                                            if (chosenThWords[ord]) {
                                              tpl = tpl.replace(new RegExp(`\\{${ord}\\}`, 'g'), chosenThWords[ord]);
                                            }
                                          }
                                          thSentence = tpl;
                                        } else {
                                          thSentence = requiredOrders.map(ord => chosenThWords[ord] || '').filter(Boolean).join(' ');
                                        }

                                        allSolutions.push({ en: enSentence, th: thSentence });
                                      }
                                    }
                                  }

                                  if (allSolutions.length === 0) return null;

                                  return (
                                    <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#1e3a8a] text-xs sm:text-sm">
                                          💡 เฉลยคำตอบทั้งหมดที่ระบบคำนวณจากตาราง Matrix ({allSolutions.length} รูปแบบ):
                                        </span>
                                        <span className="text-[11px] text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                          นักเรียนตอบแบบใดก็ได้
                                        </span>
                                      </div>
                                      <div className="space-y-1.5 pt-1">
                                        {allSolutions.map((sol, sIdx) => (
                                          <div key={sIdx} className="bg-white p-2.5 rounded-xl border border-blue-200 text-xs flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-mono font-bold text-[#1e3a8a]">
                                              {sIdx + 1}. {sol.en}
                                            </span>
                                            {sol.th && (
                                              <span className="text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                📖 {sol.th}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </>
                            )}

                            {/* Picture Description & AI Pattern Locking */}
                            {currentQuizExercise.exercise.type === 'picture_description' && (
                              <div className="space-y-4">
                                {/* 1. Image Upload & URL */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="block font-bold text-slate-800 uppercase text-xs sm:text-sm">
                                      🖼️ รูปภาพประจำข้อ (ATTACH IMAGE):
                                    </label>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      อัปโหลดไฟล์ภาพเข้า Supabase Storage หรือวางลิงก์ URL
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                    {/* Upload Button */}
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        📁 เลือกไฟล์ภาพจากเครื่อง:
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-xs font-bold text-blue-700 transition-all shadow-2xs">
                                          <Upload className="w-4 h-4" />
                                          <span>{isUploadingImage[idx] ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ภาพ (PNG, JPG, WebP)'}</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploadingImage[idx]}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleUploadImage(idx, file);
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>

                                    {/* Direct URL Input */}
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        🔗 หรือระบุ Image URL โดยตรง:
                                      </label>
                                      <input
                                        type="text"
                                        value={q.image_url || ''}
                                        onChange={(e) => handleUpdateQuestion(idx, 'image_url', e.target.value)}
                                        placeholder="https://... หรือ data:image/..."
                                        className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#2563eb]"
                                      />
                                    </div>
                                  </div>

                                  {/* Image Preview */}
                                  {q.image_url && (
                                    <div className="pt-2 border-t border-slate-200 flex items-center gap-4">
                                      <div className="relative w-28 h-28 rounded-xl border border-slate-300 bg-white p-1 overflow-hidden shrink-0 shadow-2xs">
                                        <img
                                          src={q.image_url}
                                          alt={`ภาพที่ ${idx + 1}`}
                                          className="w-full h-full object-contain rounded-lg"
                                        />
                                      </div>
                                      <div className="flex-1 text-xs text-slate-600">
                                        <span className="font-bold text-slate-800 block mb-1">ตัวอย่างรูปภาพที่จะแสดงในหน้านักเรียน</span>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateQuestion(idx, 'image_url', '')}
                                          className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                                        >
                                          ลบรูปภาพนี้
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* 2. Context & AI Pattern Locking Rules */}
                                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="block font-bold text-amber-950 uppercase text-xs sm:text-sm">
                                      🧠 บริบทและโครงสร้างที่กำหนดให้ AI ตรวจจับ (CONTEXT & AI PATTERN LOCKING):
                                    </label>
                                    <span className="text-[11px] text-amber-800 font-medium">
                                      ระบุโครงสร้างประโยค (Core, Context, Connect) พร้อมคำอธิบายภาพ (Detailed Image Prompt) ให้ AI ใช้ตรวจจับ
                                    </span>
                                  </div>
                                  <textarea
                                    rows={10}
                                    value={q.teacher_guidance ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuizItems(prev => {
                                        const copy = [...prev];
                                        copy[idx] = { 
                                          ...copy[idx], 
                                          teacher_guidance: val, 
                                          context_hint: val,
                                          image_description: val
                                        };
                                        return copy;
                                      });
                                    }}
                                    placeholder={`Core: \tI + do + [ V.ไม่ผัน ]\nI do cook at home.\nContext: \tI + do + V.ไม่ผัน + [ to + V.ไม่ผัน ]\nI do cook at home to save money.\nConnect: \tI + do + V.ไม่ผัน + to + V.ไม่ผัน + [ even when I’m + คำคุณศัพท์]\nI do cook at home to save money even when I am tired.\n\nDetailed Image Generation Prompt\nA monochrome, black-and-white vector illustration close-up of a hand pressing a standard toggle light switch on a plain wall...\n\nKey Subject & Style Tags\nSubject: Hand pressing light switch, toggle switch`}
                                    className="w-full rounded-xl bg-white border border-amber-300 p-3.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-amber-600 leading-relaxed"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Target Model Answer */}
                            <div>
                              <label className="block font-extrabold text-[#1e3a8a] uppercase mb-1.5 text-xs sm:text-sm">
                                🎯 เฉลยตัวอย่างภาษาอังกฤษ (Model Answer):
                              </label>
                              <input
                                type="text"
                                value={q.model_answer || ''}
                                onChange={(e) => handleUpdateQuestion(idx, 'model_answer', e.target.value)}
                                placeholder="เช่น I do drink water to stay hydrated even when I'm not thirsty."
                                className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-900 font-bold font-mono focus:outline-none focus:border-[#2563eb]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="quiz-modal-footer p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
              <span className="text-xs text-slate-500 font-medium">
                ระบบจะบันทึกข้อสอบและอัปเดตลงตาราง exercise_items ใน Supabase ทันที
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-200/80 text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-300"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={isSavingQuiz}
                  className="px-6 py-2.5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer shadow-md"
                >
                  {isSavingQuiz ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
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
          <div className="modal-content-card bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="modal-header flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
              <h3 className="modal-title text-xl font-bold text-slate-900 font-heading">
                {editingUnitNum ? `📝 แก้ไข Unit ${editingUnitNum}` : '➕ Add New Unit'}
              </h3>
              <button onClick={() => setShowUnitModal(false)} className="modal-close-btn text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="modal-form-body space-y-4.5 text-sm">
              <div className="form-group-unit-num">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  Unit Number:
                </label>
                <input
                  type="number"
                  value={unitFormData.unit_number}
                  onChange={(e) => setUnitFormData(prev => ({ ...prev, unit_number: Number(e.target.value) }))}
                  className="input-unit-num w-full rounded-2xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="form-group-title">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  Unit Title:
                </label>
                <input
                  type="text"
                  value={unitFormData.title}
                  onChange={(e) => setUnitFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น Present Continuous & Sentence Expansion"
                  className="input-unit-title w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="form-group-subtitle">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  Unit Subtitle:
                </label>
                <textarea
                  rows={3}
                  value={unitFormData.subtitle}
                  onChange={(e) => setUnitFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="เช่น บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]"
                  className="input-unit-subtitle w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <div className="modal-footer flex justify-end gap-3 mt-6 border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowUnitModal(false)}
                className="btn-modal-cancel px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-200"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleSaveUnit}
                className="btn-modal-submit px-6 py-2.5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <span>บันทึก Unit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE / EDIT BOOK MODAL (WITH CUSTOM SLUG INPUT) */}
      {/* ========================================================= */}
      {showBookModal && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="modal-content-card bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="modal-header flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
              <h3 className="modal-title text-xl font-bold text-slate-900 font-heading">
                {editingBookId ? '📝 แก้ไขข้อมูลหนังสือ & URL Slug' : '➕ สร้างหนังสือใหม่ (Create New Book)'}
              </h3>
              <button onClick={() => setShowBookModal(false)} className="modal-close-btn text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="modal-form-body space-y-4.5 text-sm">
              {/* Book Title */}
              <div className="form-group-title">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  ชื่อหนังสือ (Title):
                </label>
                <input
                  type="text"
                  value={bookFormData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setBookFormData(prev => ({
                      ...prev,
                      title: newTitle,
                      slug: prev.slug || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    }));
                  }}
                  placeholder="เช่น Sentence Builder Vol. 1"
                  className="input-book-title w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              {/* Book Custom Slug */}
              <div className="form-group-slug">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm flex items-center justify-between">
                  <span>URL Slug (สำหรับเว็บ & QR Code):</span>
                  <span className="text-xs text-slate-400 lowercase font-mono">domain.com/slug</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-mono font-bold">/</span>
                  <input
                    type="text"
                    value={bookFormData.slug}
                    onChange={(e) => setBookFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-') }))}
                    placeholder="sentence-builder-vol-2"
                    className="input-book-slug w-full rounded-2xl bg-slate-50 border border-slate-300 pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-[#2563eb] focus:outline-none focus:border-[#2563eb] focus:bg-white"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  💡 Slug จะถูกนำไปใช้เป็น URL ของหน้าหนังสือ และใช้สร้าง QR Code ประจำเล่ม
                </p>
              </div>

              {/* Book Subtitle */}
              <div className="form-group-subtitle">
                <label className="form-label block font-bold text-slate-700 uppercase mb-1.5 text-xs sm:text-sm">
                  คำอธิบายแบบย่อ (Subtitle):
                </label>
                <textarea
                  rows={3}
                  value={bookFormData.subtitle}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="เช่น แบบฝึกหัดแต่งประโยคและขยายประโยคภาษาอังกฤษ"
                  className="input-book-subtitle w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <div className="modal-footer flex justify-end gap-3 mt-6 border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowBookModal(false)}
                className="btn-modal-cancel px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-200"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleSaveBook}
                disabled={isSubmittingBook}
                className="btn-modal-submit px-6 py-2.5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer shadow-md"
              >
                {isSubmittingBook ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
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
