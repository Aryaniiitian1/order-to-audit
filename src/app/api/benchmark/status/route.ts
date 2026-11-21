import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CostingService } from '@/services/costing.service';
import { OrderService } from '@/services/order.service';

export async function GET() {
  try {
    const [items, runs, orders, invoices, payments] = await Promise.all([
      prisma.item.findMany(),
      prisma.productionRun.findMany({
        include: { consumptions: { include: { item: true } }, overheads: true },
        orderBy: { runDate: 'desc' },
      }),
      prisma.salesOrder.findMany({
        include: { customer: true, items: { include: { item: true } } },
      }),
      prisma.invoice.findMany({
        include: { customer: true, payments: true },
      }),
      prisma.paymentReceipt.findMany(),
    ]);

    const flour = items.find((i) => i.code === 'RM-FLOUR');
    const oil = items.find((i) => i.code === 'RM-OIL');
    const pouch = items.find((i) => i.code === 'PM-POUCH-200G');
    const murukku = items.find((i) => i.code === 'FG-MURUKKU-200G');

    const latestRun = runs[0] || null;
    let costing = null;
    let oilConsumption = null;
    if (latestRun) {
      costing = await CostingService.calculateProductionCost(latestRun.id, 'FIFO');
      oilConsumption = latestRun.consumptions.find((c) => c.item.code === 'RM-OIL');
    }

    const orderA = orders.find((o) => o.customer.name.includes('Retailer A'));
    const orderB = orders.find((o) => o.customer.name.includes('Distributor B'));
    let stockCheckB = null;
    if (orderB) {
      stockCheckB = await OrderService.verifyOrderStock(orderB.id);
    }

    const invoiceA = invoices.find((inv) => inv.customer.name.includes('Retailer A'));
    let retailerAOutstanding = null;
    if (invoiceA) {
      const totalPaid = invoiceA.payments.reduce((sum, p) => sum + p.amountReceived, 0);
      retailerAOutstanding = invoiceA.grandTotal - totalPaid;
    }

    const checks = [
      {
        id: 'flour',
        label: 'Flour closing balance',
        actual: flour ? `${flour.currentStock} kg` : 'N/A',
        expected: '120 kg (after step 2)',
        pass: flour?.currentStock === 120,
      },
      {
        id: 'oil',
        label: 'Oil closing balance',
        actual: oil ? `${oil.currentStock} L` : 'N/A',
        expected: '19.5 L (after step 2)',
        pass: oil?.currentStock === 19.5,
      },
      {
        id: 'pouches',
        label: 'Pouches closing balance',
        actual: pouch ? `${pouch.currentStock} pcs` : 'N/A',
        expected: '306 pcs (after step 2)',
        pass: pouch?.currentStock === 306,
      },
      {
        id: 'murukku_run',
        label: 'Finished goods after run',
        actual: murukku ? `${murukku.currentStock} pkts` : 'N/A',
        expected: '238 pkts (after step 2)',
        pass: murukku?.currentStock === 238 || murukku?.currentStock === 88, // 88 after dispatch
      },
      {
        id: 'murukku_dispatch',
        label: 'Finished goods after Retailer A dispatch',
        actual: murukku ? `${murukku.currentStock} pkts` : 'N/A',
        expected: '88 pkts (after step 5)',
        pass: murukku?.currentStock === 88,
      },
      {
        id: 'yield_var',
        label: 'Yield variance (-6%, flagged)',
        actual: latestRun ? `${latestRun.yieldVariancePercent}% (Flag: ${latestRun.yieldVarianceFlag})` : 'N/A',
        expected: '-6%, flagged',
        pass: latestRun?.yieldVariancePercent === -6 && latestRun?.yieldVarianceFlag === true,
      },
      {
        id: 'oil_var',
        label: 'Oil consumption variance (+5%, flagged)',
        actual: oilConsumption ? `+${oilConsumption.variancePercent}% (Flag: ${oilConsumption.varianceFlag})` : 'N/A',
        expected: '+5%, flagged',
        pass: oilConsumption?.variancePercent === 5 && oilConsumption?.varianceFlag === true,
      },
      {
        id: 'invoice_a',
        label: 'Retailer A GST invoice',
        actual: invoiceA ? `₹${invoiceA.grandTotal.toFixed(2)} (Tax: ₹${(invoiceA.cgstAmount + invoiceA.sgstAmount).toFixed(2)})` : 'N/A',
        expected: '₹7,875 (₹7,500 + ₹187.50 CGST + ₹187.50 SGST)',
        pass: invoiceA?.grandTotal === 7875,
      },
      {
        id: 'outstanding_a',
        label: 'Retailer A outstanding balance',
        actual: retailerAOutstanding !== null ? `₹${retailerAOutstanding.toFixed(2)}` : 'N/A',
        expected: '₹3,875.00 (after ₹4,000 paid)',
        pass: retailerAOutstanding === 3875,
      },
      {
        id: 'order_b_shortage',
        label: 'Distributor B shortage alert & IGST',
        actual: stockCheckB ? `Shortage: ${stockCheckB.items[0]?.shortage} pkts, Shortage Alert: ${stockCheckB.hasInsufficientStock}, Tax: ${stockCheckB.applicableTax}` : 'N/A',
        expected: 'Shortage 32 pkts flagged; IGST (5%) applies',
        pass: stockCheckB?.items[0]?.shortage === 32 && stockCheckB?.hasInsufficientStock === true,
      },
      {
        id: 'cost_packet',
        label: 'Murukku 200g Cost Per Packet',
        actual: costing ? `₹${costing.costPerPacket.toFixed(2)} (Margin: ₹${costing.grossMarginPerPacket.toFixed(2)} / ${costing.grossMarginPercentage}%)` : 'N/A',
        expected: '₹30.90 per packet (with FIFO + ₹1,800 overheads)',
        pass: costing?.costPerPacket.toNumber() === 30.90,
      },
    ];

    const allPassed = checks.every((c) => c.pass);

    return NextResponse.json({
      success: true,
      items,
      runs,
      orders,
      invoices,
      checks,
      allPassed,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
