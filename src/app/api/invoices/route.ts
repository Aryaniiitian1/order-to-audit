import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        items: { include: { item: true } },
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const approvedOrdersWithoutInvoice = await prisma.salesOrder.findMany({
      where: {
        status: 'APPROVED',
        invoice: null,
      },
      include: { customer: true, items: { include: { item: true } } },
    });

    return NextResponse.json({ success: true, invoices, approvedOrders: approvedOrdersWithoutInvoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invoice = await InvoiceService.createInvoiceFromOrder(body);
    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
