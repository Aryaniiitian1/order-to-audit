import { prisma } from '../lib/db';
import { InventoryService } from './inventory.service';
import { InvoiceService } from './invoice.service';
import { PurchaseService } from './purchase.service';
import { ProductionService } from './production.service';
import { Decimal, roundMoney } from '../lib/decimal';

export class ReportService {
  /**
   * Sales Register with customer-wise and product-wise breakdowns.
   */
  static async getSalesRegister(startDate?: Date, endDate?: Date) {
    const where: any = { isCancelled: false };
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: { include: { item: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    let totalTaxable = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);
    let grandTotal = new Decimal(0);

    const customerSummaryMap = new Map<string, { customerName: string; totalTaxable: Decimal; grandTotal: Decimal }>();
    const productSummaryMap = new Map<string, { productName: string; totalQty: Decimal; totalTaxable: Decimal }>();

    for (const inv of invoices) {
      totalTaxable = totalTaxable.plus(inv.taxableAmount);
      totalCGST = totalCGST.plus(inv.cgstAmount);
      totalSGST = totalSGST.plus(inv.sgstAmount);
      totalIGST = totalIGST.plus(inv.igstAmount);
      grandTotal = grandTotal.plus(inv.grandTotal);

      // Customer rollup
      const cId = inv.customerId;
      const cExisting = customerSummaryMap.get(cId) || {
        customerName: inv.customer.name,
        totalTaxable: new Decimal(0),
        grandTotal: new Decimal(0),
      };
      cExisting.totalTaxable = cExisting.totalTaxable.plus(inv.taxableAmount);
      cExisting.grandTotal = cExisting.grandTotal.plus(inv.grandTotal);
      customerSummaryMap.set(cId, cExisting);

      // Product rollup
      for (const item of inv.items) {
        const pId = item.itemId;
        const pExisting = productSummaryMap.get(pId) || {
          productName: item.item.name,
          totalQty: new Decimal(0),
          totalTaxable: new Decimal(0),
        };
        pExisting.totalQty = pExisting.totalQty.plus(item.quantity);
        pExisting.totalTaxable = pExisting.totalTaxable.plus(item.taxable);
        productSummaryMap.set(pId, pExisting);
      }
    }

    return {
      invoices,
      totals: {
        totalTaxable: totalTaxable.toNumber(),
        totalCGST: totalCGST.toNumber(),
        totalSGST: totalSGST.toNumber(),
        totalIGST: totalIGST.toNumber(),
        grandTotal: grandTotal.toNumber(),
      },
      customerSummary: Array.from(customerSummaryMap.values()).map((c) => ({
        customerName: c.customerName,
        totalTaxable: c.totalTaxable.toNumber(),
        grandTotal: c.grandTotal.toNumber(),
      })),
      productSummary: Array.from(productSummaryMap.values()).map((p) => ({
        productName: p.productName,
        totalQty: p.totalQty.toNumber(),
        totalTaxable: p.totalTaxable.toNumber(),
      })),
    };
  }

  /**
   * GST Outward Supply Summary structured for GSTR-1 (Table 4 B2B, Table 5/7 B2C, Table 12 HSN Summary).
   */
  static async getGSTSummary(startDate?: Date, endDate?: Date) {
    const where: any = { isCancelled: false };
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: { include: { item: true } },
      },
    });

    let b2bTaxable = new Decimal(0);
    let b2bCGST = new Decimal(0);
    let b2bSGST = new Decimal(0);
    let b2bIGST = new Decimal(0);

    let b2cTaxable = new Decimal(0);
    let b2cCGST = new Decimal(0);
    let b2cSGST = new Decimal(0);
    let b2cIGST = new Decimal(0);

    const hsnMap = new Map<string, { hsnCode: string; description: string; uom: string; totalQty: Decimal; totalValue: Decimal; cgst: Decimal; sgst: Decimal; igst: Decimal }>();

    for (const inv of invoices) {
      const isB2B = Boolean(inv.customer.gstin && inv.customer.gstin.trim().length === 15);

      if (isB2B) {
        b2bTaxable = b2bTaxable.plus(inv.taxableAmount);
        b2bCGST = b2bCGST.plus(inv.cgstAmount);
        b2bSGST = b2bSGST.plus(inv.sgstAmount);
        b2bIGST = b2bIGST.plus(inv.igstAmount);
      } else {
        b2cTaxable = b2cTaxable.plus(inv.taxableAmount);
        b2cCGST = b2cCGST.plus(inv.cgstAmount);
        b2cSGST = b2cSGST.plus(inv.sgstAmount);
        b2cIGST = b2cIGST.plus(inv.igstAmount);
      }

      // HSN table aggregation
      for (const item of inv.items) {
        const hsn = item.hsnCode;
        const existing = hsnMap.get(hsn) || {
          hsnCode: hsn,
          description: item.item.name,
          uom: item.item.uom,
          totalQty: new Decimal(0),
          totalValue: new Decimal(0),
          cgst: new Decimal(0),
          sgst: new Decimal(0),
          igst: new Decimal(0),
        };
        existing.totalQty = existing.totalQty.plus(item.quantity);
        existing.totalValue = existing.totalValue.plus(item.taxable);
        existing.cgst = existing.cgst.plus(item.cgstAmount);
        existing.sgst = existing.sgst.plus(item.sgstAmount);
        existing.igst = existing.igst.plus(item.igstAmount);
        hsnMap.set(hsn, existing);
      }
    }

    return {
      b2b: {
        taxable: b2bTaxable.toNumber(),
        cgst: b2bCGST.toNumber(),
        sgst: b2bSGST.toNumber(),
        igst: b2bIGST.toNumber(),
        totalTax: b2bCGST.plus(b2bSGST).plus(b2bIGST).toNumber(),
      },
      b2c: {
        taxable: b2cTaxable.toNumber(),
        cgst: b2cCGST.toNumber(),
        sgst: b2cSGST.toNumber(),
        igst: b2cIGST.toNumber(),
        totalTax: b2cCGST.plus(b2cSGST).plus(b2cIGST).toNumber(),
      },
      hsnSummary: Array.from(hsnMap.values()).map((h) => ({
        hsnCode: h.hsnCode,
        description: h.description,
        uom: h.uom,
        totalQty: h.totalQty.toNumber(),
        totalValue: h.totalValue.toNumber(),
        cgst: h.cgst.toNumber(),
        sgst: h.sgst.toNumber(),
        igst: h.igst.toNumber(),
      })),
      gstr3bLiability: {
        totalTaxable: b2bTaxable.plus(b2cTaxable).toNumber(),
        totalCGST: b2bCGST.plus(b2cCGST).toNumber(),
        totalSGST: b2bSGST.plus(b2cSGST).toNumber(),
        totalIGST: b2bIGST.plus(b2cIGST).toNumber(),
        totalTaxLiability: b2bCGST.plus(b2cCGST).plus(b2bSGST).plus(b2cSGST).plus(b2bIGST).plus(b2cIGST).toNumber(),
      },
    };
  }

  /**
   * Owner dashboard executive KPIs.
   */
  static async getOwnerDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, totalItems, stockSummary, receivables, recentRuns] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { orderDate: { gte: today } },
        include: { customer: true, items: { include: { item: true } } },
      }),
      prisma.item.count(),
      InventoryService.getStockSummary(),
      InvoiceService.getCustomerReceivables(),
      ProductionService.getProductionRuns(),
    ]);

    const totalReceivables = receivables.reduce((sum, r) => sum + r.totalOutstanding, 0);
    const lowStockAlerts = stockSummary.filter((s) => s.isLowStock);
    const varianceAlerts = recentRuns.filter(
      (r) => r.yieldVarianceFlag || r.consumptions.some((c) => c.varianceFlag)
    );

    return {
      todayOrdersCount: todayOrders.length,
      todayOrdersTotal: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      totalReceivables,
      lowStockAlerts,
      varianceAlertsCount: varianceAlerts.length,
      varianceAlerts,
      recentRuns: recentRuns.slice(0, 5),
      stockSummary,
    };
  }
}
