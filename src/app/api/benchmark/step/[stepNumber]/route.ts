import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PurchaseService } from '@/services/purchase.service';
import { ProductionService } from '@/services/production.service';
import { OrderService } from '@/services/order.service';
import { InvoiceService } from '@/services/invoice.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { stepNumber: string } }
) {
  try {
    const step = params.stepNumber;

    const flour = await prisma.item.findUniqueOrThrow({ where: { code: 'RM-FLOUR' } });
    const oil = await prisma.item.findUniqueOrThrow({ where: { code: 'RM-OIL' } });
    const spice = await prisma.item.findUniqueOrThrow({ where: { code: 'RM-SPICE' } });
    const murukku = await prisma.item.findUniqueOrThrow({ where: { code: 'FG-MURUKKU-200G' } });
    const supplier = await prisma.supplier.findFirstOrThrow();
    const bom = await prisma.bOM.findFirstOrThrow({ where: { finishedGoodItemId: murukku.id } });
    const retailerA = await prisma.customer.findFirstOrThrow({ where: { name: { contains: 'Retailer A' } } });
    const distributorB = await prisma.customer.findFirstOrThrow({ where: { name: { contains: 'Distributor B' } } });
    const salesmanA = await prisma.user.findUniqueOrThrow({ where: { username: 'salesman_a' } });
    const salesmanB = await prisma.user.findUniqueOrThrow({ where: { username: 'salesman_b' } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

    if (step === '1' || step === 'all') {
      // Step 1: Purchase 60 kg flour at ₹45/kg
      await PurchaseService.recordPurchase({
        supplierId: supplier.id,
        items: [{ itemId: flour.id, quantity: 60.0, rate: 45.0, taxRate: 5.0 }],
      });
    }

    if (step === '2' || step === 'all') {
      // Step 2 & 3: Production run
      await ProductionService.recordProductionRun({
        bomId: bom.id,
        plannedBatches: 1.0,
        issuedMaterials: [
          { itemId: flour.id, actualQty: 40.0 },
          { itemId: oil.id, actualQty: 10.5 },
          { itemId: spice.id, actualQty: 1.2 },
        ],
        actualGoodOutput: 188.0,
        damagedPouches: 6.0,
        cartonsUsed: 9.0,
        notes: 'Section 5 benchmark production run',
        supervisorId: admin.id,
      });
    }

    if (step === '4' || step === 'all') {
      // Step 4: Salesman A order (150 packets)
      await OrderService.createOrder({
        customerId: retailerA.id,
        salesmanId: salesmanA.id,
        items: [{ itemId: murukku.id, quantity: 150.0, unitPrice: 50.0 }],
        notes: 'Benchmark order for Retailer A',
      });
    }

    if (step === '5' || step === 'all') {
      // Step 5: Admin approve, invoice, dispatch
      const orderA = await prisma.salesOrder.findFirstOrThrow({
        where: { customerId: retailerA.id, status: 'SUBMITTED' },
      });
      await OrderService.updateOrderStatus(orderA.id, 'APPROVE', undefined, admin.id);
      const invoiceA = await InvoiceService.createInvoiceFromOrder({ salesOrderId: orderA.id, adminUserId: admin.id });
      await InvoiceService.recordDispatch(invoiceA.id, admin.id);
    }

    if (step === '6' || step === 'all') {
      // Step 6: Salesman B order (120 packets)
      await OrderService.createOrder({
        customerId: distributorB.id,
        salesmanId: salesmanB.id,
        items: [{ itemId: murukku.id, quantity: 120.0, unitPrice: 50.0 }],
        notes: 'Benchmark order for Distributor B',
      });
    }

    if (step === '7' || step === 'all') {
      // Step 7: Record payment ₹4,000 from Retailer A
      const invoiceA = await prisma.invoice.findFirstOrThrow({
        where: { customerId: retailerA.id },
      });
      await InvoiceService.recordPayment({
        customerId: retailerA.id,
        invoiceId: invoiceA.id,
        amount: 4000.0,
        paymentMode: 'BANK_TRANSFER',
        notes: 'Part payment of ₹4,000 for Retailer A invoice',
      });
    }

    if (step === '8' || step === 'all') {
      // Step 8: Add overheads Labour ₹1,200 & Power/Gas ₹600
      const run = await prisma.productionRun.findFirstOrThrow({
        orderBy: { runDate: 'desc' },
      });
      await ProductionService.addOverheads({
        productionRunId: run.id,
        overheads: [
          { overheadType: 'LABOUR', amount: 1200.0, notes: 'Batch direct labour' },
          { overheadType: 'POWER_GAS', amount: 600.0, notes: 'LPG fuel and electrical power' },
        ],
      });
    }

    return NextResponse.json({ success: true, message: `Benchmark step ${step} executed successfully.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
