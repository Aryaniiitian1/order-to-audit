import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salesmanId = searchParams.get('salesmanId') || undefined;
    const status = searchParams.get('status') || undefined;

    const orders = await OrderService.getOrders({ salesmanId, status });
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    const items = await prisma.item.findMany({
      where: { category: 'FINISHED_GOOD' },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, orders, customers, items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = await OrderService.createOrder(body);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
