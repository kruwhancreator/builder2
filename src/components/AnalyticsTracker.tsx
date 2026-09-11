'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string>('');

  useEffect(() => {
    if (!pathname || pathname.startsWith('/backend-admin') || pathname.startsWith('/api')) {
      return;
    }

    // Debounce duplicate calls for same pathname in rapid succession
    if (lastTrackedRef.current === pathname) {
      return;
    }
    lastTrackedRef.current = pathname;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return;

    const bookSlug = segments[0] || 'sentence-builder-vol-2';

    // 1. Track Book Visit / QR Scan (Session-scoped to avoid reload spam)
    const bookSessionKey = `sb_track_book_${bookSlug}`;
    try {
      if (!sessionStorage.getItem(bookSessionKey)) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'book', bookName: bookSlug })
        }).then(res => { if (res.ok) sessionStorage.setItem(bookSessionKey, '1'); }).catch(() => {});
      }
    } catch {
      // ignore storage access errors (private mode)
    }

    // 2. Track Unit / Chapter View (Session-scoped per unit)
    const chapterSegment = segments.find(s => s.startsWith('chapter-') || s.startsWith('unit-'));
    if (chapterSegment) {
      const unitNumber = parseInt(chapterSegment.replace(/^(chapter|unit)-/, ''), 10);
      if (!isNaN(unitNumber) && unitNumber > 0) {
        const unitSessionKey = `sb_track_unit_${bookSlug}_${unitNumber}`;
        try {
          if (!sessionStorage.getItem(unitSessionKey)) {
            fetch('/api/analytics/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'unit', bookName: bookSlug, unitNumber })
            }).then(res => { if (res.ok) sessionStorage.setItem(unitSessionKey, '1'); }).catch(() => {});
          }
        } catch {
          // ignore storage access errors
        }
      }
    }
  }, [pathname]);

  return null;
}
