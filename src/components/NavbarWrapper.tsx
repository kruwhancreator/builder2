'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Check, BookOpen } from 'lucide-react';

interface UnitItem {
  id?: string;
  unit_number: number;
  title: string;
  subtitle?: string;
}

export function HeaderWrapper() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [bookInfo, setBookInfo] = useState<{ title: string; subtitle?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse bookSlug and currentUnit from URL: /[bookSlug]/chapter-[N] or /[bookSlug]
  const pathSegments = (pathname || '').split('/').filter(Boolean);
  const bookSlug = pathSegments[0] || 'sentence-builder-vol-2';
  const chapterSegment = pathSegments[1] || 'chapter-1';
  const currentUnitNumber = Number(chapterSegment.replace(/^(chapter|unit)-/, '')) || 1;

  // Fetch book metadata and all units available for this book
  useEffect(() => {
    if (pathname?.startsWith('/backend-admin')) return;

    let isMounted = true;
    setIsLoading(true);

    async function loadCurriculum() {
      try {
        const res = await fetch(`/api/admin/curriculum?book=${bookSlug}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.bookInfo) {
            setBookInfo(data.bookInfo);
          } else {
            setBookInfo({
              title: bookSlug,
              subtitle: 'ระบบเฉลยและตรวจแบบฝึกหัด'
            });
          }
          if (data.units && data.units.length > 0) {
            setUnits(data.units);
          } else {
            setUnits([]);
          }
        }
      } catch (err) {
        console.error('Failed to load curriculum:', err);
        if (isMounted) {
          setBookInfo({
            title: bookSlug,
            subtitle: 'ระบบเฉลยและตรวจแบบฝึกหัด'
          });
          setUnits([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCurriculum();
    return () => { isMounted = false; };
  }, [bookSlug, pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide global student header on backend-admin routes
  if (pathname?.startsWith('/backend-admin')) {
    return null;
  }

  const currentUnit = units.find(u => u.unit_number === currentUnitNumber) || {
    unit_number: currentUnitNumber,
    title: `Unit ${currentUnitNumber}`,
    subtitle: `บทที่ ${currentUnitNumber}`
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* LEFT COLUMN: Dynamic Book Title & Subtitle or Shimmer Loading */}
        {isLoading || !bookInfo ? (
          <div className="flex flex-col gap-1.5 min-w-[180px] sm:min-w-[260px] animate-pulse py-1">
            <div className="h-5 w-44 sm:w-56 bg-slate-200/80 rounded-md"></div>
            <div className="h-3.5 w-56 sm:w-72 bg-slate-100 rounded-md"></div>
          </div>
        ) : (
          <Link href={`/${bookSlug}`} className="flex flex-col group min-w-0 hover:opacity-90 transition-opacity">
            <h1 className="text-base sm:text-lg font-bold text-[#1e3a8a] tracking-wide font-heading truncate">
              {bookInfo.title}
            </h1>
            {bookInfo.subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                {bookInfo.subtitle}
              </p>
            )}
          </Link>
        )}

        {/* RIGHT COLUMN: Curriculum of Units Navigation Dropdown or Skeleton */}
        {isLoading ? (
          <div className="h-9 w-32 sm:w-36 bg-slate-100 animate-pulse rounded-xl border border-slate-200/60 shrink-0"></div>
        ) : (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] font-bold border border-[#bfdbfe] transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
              aria-expanded={isOpen}
            >
              <span>📘 แบบฝึกหัด Unit {currentUnit.unit_number}</span>
              <ChevronDown className={`w-4 h-4 text-[#1e40af] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

          {/* Dropdown Menu of All Units in this Book */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  สารบัญบทเรียน (Curriculum)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  {units.length} Units
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                {units.map((unit) => {
                  const isActive = unit.unit_number === currentUnitNumber;
                  return (
                    <Link
                      key={unit.unit_number}
                      href={`/${bookSlug}/chapter-${unit.unit_number}`}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-start justify-between gap-2.5 p-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-blue-50/90 text-[#1e40af] font-bold border border-blue-200/80 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-bold shrink-0 ${
                            isActive ? 'bg-[#2563eb] text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Unit {unit.unit_number}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold truncate block">
                            {unit.title || `บทที่ ${unit.unit_number}`}
                          </span>
                        </div>
                        {unit.subtitle && (
                          <p className="text-xs text-slate-500 truncate mt-1 pl-0.5">
                            {unit.subtitle}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <Check className="w-4 h-4 text-[#2563eb] shrink-0 mt-1" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </header>
  );
}

export function FooterWrapper() {
  const pathname = usePathname();

  // Hide global student footer on backend-admin routes
  if (pathname?.startsWith('/backend-admin')) {
    return null;
  }

  return (
    <footer className="text-center py-7 text-sm text-slate-600 border-t border-slate-200 bg-white">
      <p>© Sentence Builder 2 โดย ครูหวาน อิงลิช ออน แอร์ • ระบบเฉลยและตรวจแบบฝึกหัด</p>
    </footer>
  );
}
