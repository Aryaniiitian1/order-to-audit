import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const data = await InventoryService.getItemLedger(params.itemId);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
