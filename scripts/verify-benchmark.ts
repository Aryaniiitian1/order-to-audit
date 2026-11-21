import { prisma } from '../src/lib/db';
import { PurchaseService } from '../src/services/purchase.service';
import { ProductionService } from '../src/services/production.service';
import { OrderService } from '../src/services/order.service';
import { InvoiceService } from '../src/services/invoice.service';
import { CostingService } from '../src/services/costing.service';
import { ReportService } from '../src/services/report.service';
import { InventoryService } from '../src/services/inventory.service';

async function runBenchmarkVerification() {
  console.log('================================================================');
  console.log('   NIT TRICHY BENCHMARK SCENARIO VERIFICATION (SECTION 5)       ');
  console.log('================================================================\n');

  // Fetch seeded master items
  const flour = await prisma.item.findUniqueOrThrow({ where: { code: 'RM-FLOUR' } });
  const oil = await prisma.item.findUniqueOrThrow({ where: { code: 'RM-OIL' } });
  const spice = await prisma.item.findUniqueOrThrow({ where: { code: 'RM-SPICE' } });
  const pouch = await prisma.item.findUniqueOrThrow({ where: { code: 'PM-POUCH-200G' } });
  const carton = await prisma.item.findUniqueOrThrow({ where: { code: 'PM-CARTON-20PKT' } });
  const murukku = await prisma.item.findUniqueOrThrow({ where: { code: 'FG-MURUKKU-200G' } });

  const retailerA = await prisma.customer.findFirstOrThrow({ where: { name: { contains: 'Retailer A' } } });
  const distributorB = await prisma.customer.findFirstOrThrow({ where: { name: { contains: 'Distributor B' } } });
  const supplier = await prisma.supplier.findFirstOrThrow();
  const bom = await prisma.bOM.findFirstOrThrow({ where: { finishedGoodItemId: murukku.id } });
  const salesmanA = await prisma.user.findUniqueOrThrow({ where: { username: 'salesman_a' } });
  const salesmanB = await prisma.user.findUniqueOrThrow({ where: { username: 'salesman_b' } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

  console.log('--- Initial Opening Stock Check ---');
  console.log(`Flour Opening: ${flour.currentStock} kg (Expected: 100 kg)`);
  console.log(`Oil Opening: ${oil.currentStock} L (Expected: 30 L)`);
  console.log(`Spice Mix Opening: ${spice.currentStock} kg (Expected: 5 kg)`);
  console.log(`Pouches Opening: ${pouch.currentStock} pcs (Expected: 500 pcs)`);
  console.log(`Cartons Opening: ${carton.currentStock} pcs (Expected: 30 pcs)`);
  console.log(`Murukku 200g Opening: ${murukku.currentStock} packets (Expected: 50 packets)\n`);

  // STEP 1: Record purchase of 60 kg flour at ₹45/kg
  console.log('[STEP 1] Recording purchase of 60 kg flour at ₹45/kg...');
  const purchase = await PurchaseService.recordPurchase({
    supplierId: supplier.id,
    items: [{ itemId: flour.id, quantity: 60.0, rate: 45.0, taxRate: 5.0 }],
  });
  const flourAfterPurchase = await prisma.item.findUniqueOrThrow({ where: { id: flour.id } });
  console.log(`✓ Purchase recorded: ${purchase.purchaseNumber}`);
  console.log(`✓ Flour stock after purchase: ${flourAfterPurchase.currentStock} kg (100 + 60 = 160 kg)\n`);

  // STEP 2 & 3: Production run
  console.log('[STEP 2 & 3] Starting production run of Murukku 200 g...');
  console.log('Issuing: 40 kg flour, 10.5 L oil (0.5 L over standard), 1.2 kg spice mix.');
  console.log('Recording actual output: 188 good packets, 6 pouches damaged, 9 cartons used.');
  const productionRun = await ProductionService.recordProductionRun({
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

  const flourAfterRun = await prisma.item.findUniqueOrThrow({ where: { id: flour.id } });
  const oilAfterRun = await prisma.item.findUniqueOrThrow({ where: { id: oil.id } });
  const pouchAfterRun = await prisma.item.findUniqueOrThrow({ where: { id: pouch.id } });
  const murukkuAfterRun = await prisma.item.findUniqueOrThrow({ where: { id: murukku.id } });

  console.log(`✓ Production Run Number: ${productionRun.runNumber}`);
  console.log(`✓ Flour closing balance: ${flourAfterRun.currentStock} kg (Expected: 120 kg)`);
  console.log(`✓ Oil closing balance: ${oilAfterRun.currentStock} L (Expected: 19.5 L)`);
  console.log(`✓ Pouches closing balance: ${pouchAfterRun.currentStock} pcs (Expected: 306 pcs)`);
  console.log(`✓ Murukku 200g after run: ${murukkuAfterRun.currentStock} packets (Expected: 238 packets)`);
  console.log(`✓ Yield Variance: ${productionRun.yieldVariancePercent}% (Flagged: ${productionRun.yieldVarianceFlag})`);
  const oilConsumption = productionRun.consumptions.find((c) => c.itemId === oil.id);
  console.log(`✓ Oil Consumption Variance: +${oilConsumption?.variancePercent}% (Flagged: ${oilConsumption?.varianceFlag})\n`);

  // STEP 4: Salesman A places order for Retailer A (150 packets)
  console.log('[STEP 4] Salesman A places mobile order for Retailer A (Tamil Nadu): 150 packets...');
  const orderA = await OrderService.createOrder({
    customerId: retailerA.id,
    salesmanId: salesmanA.id,
    items: [{ itemId: murukku.id, quantity: 150.0, unitPrice: 50.0 }],
    notes: 'Order for Retailer A',
  });
  console.log(`✓ Order Created: ${orderA.orderNumber}, Total: ₹${orderA.totalAmount}\n`);

  // STEP 5: Admin approves it, raises GST invoice, records dispatch
  console.log('[STEP 5] Admin verifies stock, approves order, generates GST invoice, records dispatch...');
  const stockCheckA = await OrderService.verifyOrderStock(orderA.id);
  console.log(`Stock Check for Order A: Sufficient? ${!stockCheckA.hasInsufficientStock} (Available: ${stockCheckA.items[0].availableStock})`);
  
  await OrderService.updateOrderStatus(orderA.id, 'APPROVE', undefined, admin.id);
  const invoiceA = await InvoiceService.createInvoiceFromOrder({ salesOrderId: orderA.id, adminUserId: admin.id });
  console.log(`✓ GST Invoice Generated: ${invoiceA.invoiceNumber}`);
  console.log(`  Taxable: ₹${invoiceA.taxableAmount.toFixed(2)}`);
  console.log(`  CGST (2.5%): ₹${invoiceA.cgstAmount.toFixed(2)}`);
  console.log(`  SGST (2.5%): ₹${invoiceA.sgstAmount.toFixed(2)}`);
  console.log(`  IGST: ₹${invoiceA.igstAmount.toFixed(2)}`);
  console.log(`  Grand Total: ₹${invoiceA.grandTotal.toFixed(2)} (Expected: ₹7,875.00)`);

  await InvoiceService.recordDispatch(invoiceA.id, admin.id);
  const murukkuAfterDispatchA = await prisma.item.findUniqueOrThrow({ where: { id: murukku.id } });
  console.log(`✓ Finished goods stock after dispatch: ${murukkuAfterDispatchA.currentStock} packets (Expected: 88 packets)\n`);

  // STEP 6: Salesman B places order for Distributor B (Karnataka): 120 packets
  console.log('[STEP 6] Salesman B places order for Distributor B (Karnataka): 120 packets...');
  const orderB = await OrderService.createOrder({
    customerId: distributorB.id,
    salesmanId: salesmanB.id,
    items: [{ itemId: murukku.id, quantity: 120.0, unitPrice: 50.0 }],
    notes: 'Order for Distributor B (Karnataka)',
  });
  const stockCheckB = await OrderService.verifyOrderStock(orderB.id);
  console.log(`✓ Order Created: ${orderB.orderNumber}`);
  console.log(`✓ System Stock Verification Result:`);
  console.log(`  Available Stock: ${stockCheckB.items[0].availableStock} packets`);
  console.log(`  Requested Stock: ${stockCheckB.items[0].orderedQty} packets`);
  console.log(`  Has Shortage? ${stockCheckB.hasInsufficientStock} (Shortage: ${stockCheckB.items[0].shortage} packets)`);
  console.log(`  Place of Supply: ${stockCheckB.customerState} (Code ${stockCheckB.customerStateCode}) -> ${stockCheckB.applicableTax}\n`);

  // STEP 7: Record payment of ₹4,000 from Retailer A
  console.log('[STEP 7] Recording payment of ₹4,000 from Retailer A...');
  const payment = await InvoiceService.recordPayment({
    customerId: retailerA.id,
    invoiceId: invoiceA.id,
    amount: 4000.0,
    paymentMode: 'BANK_TRANSFER',
    notes: 'Part payment for INV/2026-27/0001',
  });
  console.log(`✓ Payment recorded: ₹4,000.00`);
  console.log(`✓ Invoice Status: ${payment.paymentStatus}`);
  console.log(`✓ Retailer A Outstanding: ₹${payment.remainingOutstanding.toFixed(2)} (Expected: ₹3,875.00)\n`);

  // STEP 8: Add labour ₹1,200 and gas/power ₹600 for run, show cost per packet
  console.log('[STEP 8] Adding manufacturing overheads: Labour ₹1,200, Gas/Power ₹600...');
  await ProductionService.addOverheads({
    productionRunId: productionRun.id,
    overheads: [
      { overheadType: 'LABOUR', amount: 1200.0, notes: 'Batch direct labour' },
      { overheadType: 'POWER_GAS', amount: 600.0, notes: 'LPG and electricity' },
    ],
  });

  const costing = await CostingService.calculateProductionCost(productionRun.id, 'FIFO');
  console.log(`✓ Total Material Cost: ₹${costing.totalMaterialCost.toFixed(2)} (RM: ₹${costing.rawMaterialCost.toFixed(2)}, Packaging: ₹${costing.packagingCost.toFixed(2)})`);
  console.log(`✓ Total Overheads: ₹${costing.totalOverheadCost.toFixed(2)} (Labour: ₹${costing.directLabourCost.toFixed(2)}, Gas/Power: ₹${costing.powerGasCost.toFixed(2)})`);
  console.log(`✓ Total Batch Production Cost: ₹${costing.totalProductionCost.toFixed(2)}`);
  console.log(`✓ Good Packets Produced: ${costing.actualGoodOutput}`);
  console.log(`✓ Cost Per Packet: ₹${costing.costPerPacket.toFixed(2)}`);
  console.log(`✓ Selling Price: ₹${costing.sellingPrice.toFixed(2)}`);
  console.log(`✓ Gross Margin Per Packet: ₹${costing.grossMarginPerPacket.toFixed(2)} (${costing.grossMarginPercentage}%)\n`);

  // STEP 9: Generate reports
  console.log('[STEP 9] Generating month reports from Section 4.6...');
  const salesReg = await ReportService.getSalesRegister();
  const gstSum = await ReportService.getGSTSummary();
  const stockSum = await InventoryService.getStockSummary();
  console.log(`✓ Sales Register Total Taxable: ₹${salesReg.totals.totalTaxable.toFixed(2)}, Grand Total: ₹${salesReg.totals.grandTotal.toFixed(2)}`);
  console.log(`✓ GSTR-3B Tax Liability: CGST ₹${gstSum.gstr3bLiability.totalCGST.toFixed(2)}, SGST ₹${gstSum.gstr3bLiability.totalSGST.toFixed(2)}`);
  console.log(`✓ Stock Ledger contains ${stockSum.length} items reconciled against immutable movement ledger.`);

  console.log('\n================================================================');
  console.log('             BENCHMARK CHECKLIST SUMMARY                        ');
  console.log('================================================================');
  const checks = [
    { label: 'Flour closing balance (120 kg)', actual: `${flourAfterRun.currentStock} kg`, expected: '120 kg', pass: flourAfterRun.currentStock === 120 },
    { label: 'Oil closing balance (19.5 L)', actual: `${oilAfterRun.currentStock} L`, expected: '19.5 L', pass: oilAfterRun.currentStock === 19.5 },
    { label: 'Pouches closing balance (306 pcs)', actual: `${pouchAfterRun.currentStock} pcs`, expected: '306 pcs', pass: pouchAfterRun.currentStock === 306 },
    { label: 'Murukku FG after run (238 pkts)', actual: `${murukkuAfterRun.currentStock} pkts`, expected: '238 pkts', pass: murukkuAfterRun.currentStock === 238 },
    { label: 'Murukku FG after Retailer A dispatch (88 pkts)', actual: `${murukkuAfterDispatchA.currentStock} pkts`, expected: '88 pkts', pass: murukkuAfterDispatchA.currentStock === 88 },
    { label: 'Yield variance (-6%, flagged)', actual: `${productionRun.yieldVariancePercent}% (flag: ${productionRun.yieldVarianceFlag})`, expected: '-6%, flagged', pass: productionRun.yieldVariancePercent === -6 && productionRun.yieldVarianceFlag },
    { label: 'Oil consumption variance (+5%, flagged)', actual: `+${oilConsumption?.variancePercent}% (flag: ${oilConsumption?.varianceFlag})`, expected: '+5%, flagged', pass: oilConsumption?.variancePercent === 5 && oilConsumption?.varianceFlag },
    { label: 'Retailer A invoice (₹7,875 total)', actual: `₹${invoiceA.grandTotal.toFixed(2)}`, expected: '₹7,875.00', pass: invoiceA.grandTotal === 7875 },
    { label: 'Retailer A outstanding (₹3,875)', actual: `₹${payment.remainingOutstanding.toFixed(2)}`, expected: '₹3,875.00', pass: payment.remainingOutstanding === 3875 },
    { label: 'Distributor B shortage (32 pkts flagged)', actual: `Shortage: ${stockCheckB.items[0].shortage} pkts, Flagged: ${stockCheckB.hasInsufficientStock}`, expected: 'Shortage 32 pkts, Flagged: true', pass: stockCheckB.items[0].shortage === 32 && stockCheckB.hasInsufficientStock },
    { label: 'Cost per packet (₹30.90)', actual: `₹${costing.costPerPacket.toFixed(2)}`, expected: '₹30.90', pass: costing.costPerPacket.toNumber() === 30.90 },
  ];

  console.table(checks);
  const allPassed = checks.every((c) => c.pass);
  console.log(`\nALL 11 BENCHMARK CHECKS PASSED: ${allPassed ? '✓ YES (100% COMPLIANT)' : '✗ NO'}`);
  console.log('================================================================\n');
}

runBenchmarkVerification()
  .catch((e) => {
    console.error('Benchmark Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
