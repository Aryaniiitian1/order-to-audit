import { NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';

export async function GET() {
  try {
    const receivables = await InvoiceService.getCustomerReceivables();
    return NextResponse.json({ success: true, receivables });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
