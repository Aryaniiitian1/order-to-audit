import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedInvoice = await InvoiceService.recordDispatch(params.id, 'admin');
    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
