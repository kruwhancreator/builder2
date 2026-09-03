import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { passcode } = body;

    const expectedPasscode = process.env.ADMIN_PASSCODE || 'KruWhanLearnerResultTeam#2026';

    if (!passcode || passcode !== expectedPasscode) {
      return NextResponse.json({ success: false, error: 'Passcode ไม่ถูกต้อง' }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ' });
  } catch (err) {
    console.error('Admin auth error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' }, { status: 500 });
  }
}
