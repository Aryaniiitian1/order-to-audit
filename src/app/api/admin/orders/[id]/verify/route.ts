import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const verification = await OrderService.verifyOrderStock(params.id);
    return NextResponse.json({ success: true, verification });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, adjustments, adminUserId } = body;
    const result = await OrderService.updateOrderStatus(
      params.id,
      action,
      adjustments,
      adminUserId
    );
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
