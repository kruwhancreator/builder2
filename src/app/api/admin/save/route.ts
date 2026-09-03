import { NextRequest, NextResponse } from 'next/server';
import { saveChapterDataToDb, getChapterDataFromDb } from '@/lib/data-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chapterData, passcode } = body;

    // Passcode verification
    const expectedPasscode = process.env.ADMIN_PASSCODE || 'KruWhanLearnerResultTeam#2026';
    if (passcode !== expectedPasscode) {
      return NextResponse.json({ error: 'Passcode ไม่ถูกต้อง' }, { status: 401 });
    }

    if (!chapterData || !chapterData.exercises) {
      return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const isSuccess = await saveChapterDataToDb(chapterData);

    if (isSuccess) {
      return NextResponse.json({ success: true, message: 'บันทึกข้อมูลเฉลยลง Supabase SQL Database เรียบร้อยแล้ว!' });
    } else {
      return NextResponse.json({ error: 'ไม่สามารถบันทึกข้อมูลลง Supabase ได้' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error saving admin changes:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get('book') || 'sentence-builder-vol-2';
  const unit = Number(searchParams.get('unit') || 1);

  const data = await getChapterDataFromDb(book, unit);
  return NextResponse.json(data);
}
