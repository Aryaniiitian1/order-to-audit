import { NextRequest, NextResponse } from 'next/server';
import { ProductionService } from '@/services/production.service';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const runs = await ProductionService.getProductionRuns();
    const boms = await prisma.bOM.findMany({
      include: {
        finishedGoodItem: true,
        items: { include: { rawItem: true } },
      },
    });

    return NextResponse.json({ success: true, runs, boms });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const run = await ProductionService.recordProductionRun(body);
    return NextResponse.json({ success: true, run });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
