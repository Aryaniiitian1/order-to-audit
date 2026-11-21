import { NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory.service';

export async function GET() {
  try {
    const summary = await InventoryService.getStockSummary();
    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
