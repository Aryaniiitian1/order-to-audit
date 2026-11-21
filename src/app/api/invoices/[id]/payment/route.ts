import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const result = await InvoiceService.recordPayment({
      customerId: body.customerId,
      invoiceId: params.id,
      amount: body.amount,
      paymentMode: body.paymentMode || 'BANK_TRANSFER',
      notes: body.notes,
    });
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
