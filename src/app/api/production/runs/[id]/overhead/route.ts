import { NextRequest, NextResponse } from 'next/server';
import { ProductionService } from '@/services/production.service';
import { CostingService } from '@/services/costing.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updatedRun = await ProductionService.addOverheads({
      productionRunId: params.id,
      overheads: body.overheads,
    });
    const costing = await CostingService.calculateProductionCost(params.id, 'FIFO');
    return NextResponse.json({ success: true, run: updatedRun, costing });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const costing = await CostingService.calculateProductionCost(params.id, 'FIFO');
    return NextResponse.json({ success: true, costing });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
