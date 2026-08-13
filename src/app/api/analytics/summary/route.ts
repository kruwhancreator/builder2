import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookName = searchParams.get('book') || 'sentence-builder-vol-2';

    let totalQrScans = 0;
    let unitViews: Array<{ unit_number: number; view_count: number }> = [];

    if (isSupabaseConfigured() && supabase) {
      // 1. Fetch Book QR Scan Count
      const { data: bookData } = await supabase
        .from('book_analytics')
        .select('qr_scan_count')
        .eq('book_name', bookName)
        .single();

      if (bookData) {
        totalQrScans = Number(bookData.qr_scan_count || 0);
      }

      // 2. Fetch Unit View Counts for Units 1 to 30
      const { data: unitsData } = await supabase
        .from('unit_analytics')
        .select('unit_number, view_count')
        .eq('book_name', bookName)
        .order('unit_number', { ascending: true });

      if (unitsData) {
        unitViews = unitsData.map(u => ({
          unit_number: u.unit_number,
          view_count: Number(u.view_count || 0)
        }));
      }
    } else {
      // Demo Fallback data when Supabase is not connected
      totalQrScans = 1540;
      unitViews = Array.from({ length: 30 }, (_, idx) => {
        const uNum = idx + 1;
        // Simulated natural funnel drop-off
        const simulatedCount = Math.max(20, Math.round(1450 * Math.pow(0.95, uNum - 1)));
        return { unit_number: uNum, view_count: simulatedCount };
      });
    }

    // Calculate Completion Funnel Percentages
    const unit1Views = unitViews.find(u => u.unit_number === 1)?.view_count || 0;
    const unit30Views = unitViews.find(u => u.unit_number === 30)?.view_count || 0;

    const qrToUnit1Conversion = totalQrScans > 0 
      ? Math.min(100, Math.round((unit1Views / totalQrScans) * 100)) 
      : 0;

    const courseCompletionRate = unit1Views > 0 
      ? Math.min(100, Math.round((unit30Views / unit1Views) * 100)) 
      : 0;

    return NextResponse.json({
      bookName,
      totalQrScans,
      unit1Views,
      unit30Views,
      qrToUnit1Conversion,
      courseCompletionRate,
      unitViews
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics summary' }, { status: 500 });
  }
}
