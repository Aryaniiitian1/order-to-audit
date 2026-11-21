import { NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';

export async function GET() {
  try {
    const summary = await ReportService.getOwnerDashboardSummary();
    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
