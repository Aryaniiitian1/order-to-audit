import { NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';

export async function GET() {
  try {
    const data = await ReportService.getSalesRegister();
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
