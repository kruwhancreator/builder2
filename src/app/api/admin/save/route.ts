import { NextRequest, NextResponse } from 'next/server';
import { saveChapterData, getChapterData } from '@/lib/data-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chapterData, passcode } = body;

    // Optional passcode verification (default: admin123)
    if (passcode !== 'admin123' && process.env.ADMIN_PASSCODE && passcode !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ error: 'Passcode ไม่ถูกต้อง' }, { status: 401 });
    }

    if (!chapterData || !chapterData.exercises) {
      return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const success = await saveChapterData(chapterData, 'chapter-1');

    if (success) {
      return NextResponse.json({ success: true, message: 'บันทึกข้อมูลและคำแนะนำ AI เรียบร้อยแล้ว!' });
    } else {
      return NextResponse.json({ error: 'ไม่สามารถบันทึกไฟล์ได้' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error saving admin changes:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}

export async function GET() {
  const data = getChapterData('chapter-1');
  return NextResponse.json(data);
}
