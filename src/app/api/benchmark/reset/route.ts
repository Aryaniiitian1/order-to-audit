import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // 1. Clear existing data
    await prisma.auditLog.deleteMany();
    await prisma.paymentReceipt.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.inventoryLedger.deleteMany();
    await prisma.productionOverhead.deleteMany();
    await prisma.productionConsumption.deleteMany();
    await prisma.productionRun.deleteMany();
    await prisma.bOMItem.deleteMany();
    await prisma.bOM.deleteMany();
    await prisma.item.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.user.deleteMany();

    // 2. Seed Users
    const passwordHash = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: { username: 'admin', name: 'Ramanathan (Admin)', passwordHash, role: 'ADMIN', phone: '+91 98401 11111' },
    });
    const salesmanA = await prisma.user.create({
      data: { username: 'salesman_a', name: 'Salesman A (Tamil Nadu)', passwordHash, role: 'SALESMAN', phone: '+91 98401 22222' },
    });
    const salesmanB = await prisma.user.create({
      data: { username: 'salesman_b', name: 'Salesman B (Karnataka)', passwordHash, role: 'SALESMAN', phone: '+91 98401 33333' },
    });
    await prisma.user.create({
      data: { username: 'supervisor', name: 'Murugan (Floor)', passwordHash, role: 'SUPERVISOR', phone: '+91 98401 44444' },
    });
    await prisma.user.create({
      data: { username: 'accountant', name: 'Sankaran (Auditor)', passwordHash, role: 'ACCOUNTANT', phone: '+91 98401 55555' },
    });
    await prisma.user.create({
      data: { username: 'owner', name: 'Sundaram (Proprietor)', passwordHash, role: 'OWNER', phone: '+91 98401 66666' },
    });

    // 3. Customers & Supplier
    await prisma.customer.create({
      data: {
        name: 'Retailer A (Chennai Grocers)',
        customerType: 'RETAILER',
        gstin: '33AABCR1234F1Z1',
        phone: '+91 94440 12345',
        address: '12 Anna Salai, T. Nagar, Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
      },
    });

    await prisma.customer.create({
      data: {
        name: 'Distributor B (Bangalore Foods)',
        customerType: 'DISTRIBUTOR',
        gstin: '29AABCD5678G1Z2',
        phone: '+91 98800 67890',
        address: '45 Brigade Road, Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
      },
    });

    await prisma.supplier.create({
      data: {
        name: 'Sri Krishna Flour Mills',
        gstin: '33AAACK9999M1Z9',
        phone: '+91 94433 11223',
        address: 'Industrial Estate, Madurai',
        state: 'Tamil Nadu',
        stateCode: '33',
      },
    });

    // 4. Items & Opening Stock
    const flour = await prisma.item.create({
      data: { code: 'RM-FLOUR', name: 'Rice & Urad Flour', category: 'RAW_MATERIAL', uom: 'KG', hsnCode: '1102', gstRate: 5.0, currentStock: 100.0, valuationRate: 42.0, minReorderLevel: 50.0 },
    });
    const oil = await prisma.item.create({
      data: { code: 'RM-OIL', name: 'Refined Cooking Oil', category: 'RAW_MATERIAL', uom: 'LITRE', hsnCode: '1515', gstRate: 5.0, currentStock: 30.0, valuationRate: 140.0, minReorderLevel: 15.0 },
    });
    const spice = await prisma.item.create({
      data: { code: 'RM-SPICE', name: 'Salt and Spice Mix', category: 'RAW_MATERIAL', uom: 'KG', hsnCode: '0910', gstRate: 5.0, currentStock: 5.0, valuationRate: 200.0, minReorderLevel: 2.0 },
    });
    const pouch = await prisma.item.create({
      data: { code: 'PM-POUCH-200G', name: '200 g Printed Pouch', category: 'PACKAGING', uom: 'PIECE', hsnCode: '3923', gstRate: 18.0, currentStock: 500.0, valuationRate: 2.50, minReorderLevel: 200.0 },
    });
    const carton = await prisma.item.create({
      data: { code: 'PM-CARTON-20PKT', name: 'Outer Carton (holds 20 pkts)', category: 'PACKAGING', uom: 'PIECE', hsnCode: '4819', gstRate: 12.0, currentStock: 30.0, valuationRate: 15.0, minReorderLevel: 10.0 },
    });
    const murukku = await prisma.item.create({
      data: { code: 'FG-MURUKKU-200G', name: 'Murukku 200 g', category: 'FINISHED_GOOD', uom: 'PACKET', hsnCode: '2106', gstRate: 5.0, currentStock: 50.0, valuationRate: 30.90, minReorderLevel: 100.0 },
    });

    // 5. Opening Stock Movements in Ledger
    const openingEntries = [
      { item: flour, qty: 100.0, rate: 42.0 },
      { item: oil, qty: 30.0, rate: 140.0 },
      { item: spice, qty: 5.0, rate: 200.0 },
      { item: pouch, qty: 500.0, rate: 2.50 },
      { item: carton, qty: 30.0, rate: 15.0 },
      { item: murukku, qty: 50.0, rate: 30.90 },
    ];

    for (const e of openingEntries) {
      await prisma.inventoryLedger.create({
        data: {
          itemId: e.item.id,
          transactionType: 'OPENING_STOCK',
          sourceDocType: 'INITIAL',
          sourceDocId: 'OPENING-2026',
          quantityChange: e.qty,
          balanceAfter: e.qty,
          unitRate: e.rate,
          notes: `Opening inventory balance for ${e.item.name}`,
        },
      });
    }

    // 6. BOM Master
    await prisma.bOM.create({
      data: {
        name: 'Standard Murukku 200 g Recipe',
        finishedGoodItemId: murukku.id,
        batchSize: 200.0,
        batchUom: 'PACKET',
        expectedYieldRatio: 1.0,
        isActive: true,
        items: {
          create: [
            { rawItemId: flour.id, standardQuantity: 40.0, uom: 'KG' },
            { rawItemId: oil.id, standardQuantity: 10.0, uom: 'LITRE' },
            { rawItemId: spice.id, standardQuantity: 1.2, uom: 'KG' },
            { rawItemId: pouch.id, standardQuantity: 200.0, uom: 'PIECE' },
            { rawItemId: carton.id, standardQuantity: 10.0, uom: 'PIECE' },
          ],
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Database reset to initial Section 5 benchmark state.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
