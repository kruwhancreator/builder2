'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface UnitItem {
  unit_number: number;
  title: string;
  subtitle?: string;
  exerciseCount?: number;
}

interface CurriculumDropdownButtonProps {
  bookSlug: string;
  units: UnitItem[];
}

export default function CurriculumDropdownButton({ bookSlug, units }: CurriculumDropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs sm:text-sm px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] font-bold border border-[#bfdbfe] transition-all flex items-center gap-1.5 sm:gap-2 shadow-2xs cursor-pointer shrink-0 min-h-[40px]"
        aria-expanded={isOpen}
      >
        <span>📘 <span className="hidden sm:inline">สารบัญ</span> {units.length} Units</span>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1e40af] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              สารบัญบทเรียน (Curriculum)
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              {units.length} Units
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
            {units.map((unit) => (
              <Link
                key={unit.unit_number}
                href={`/${bookSlug}/chapter-${unit.unit_number}`}
                onClick={() => setIsOpen(false)}
                className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl transition-all hover:bg-slate-50 text-slate-700 font-medium"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-blue-100/70 text-[#1e40af] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {unit.unit_number}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold block truncate text-slate-800">
                      Unit {unit.unit_number}: {unit.title}
                    </span>
                    {unit.subtitle && (
                      <span className="text-[11px] text-slate-400 block truncate">
                        {unit.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                {unit.exerciseCount ? (
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium pt-1">
                    {unit.exerciseCount} ข้อ
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
