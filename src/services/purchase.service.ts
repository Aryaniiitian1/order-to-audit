import { prisma } from '../lib/db';
import { InventoryService } from './inventory.service';
import { roundMoney, roundQuantity } from '../lib/decimal';

export interface CreatePurchaseItemInput {
  itemId: string;
  quantity: number;
  rate: number; // pre-tax rate per unit
  taxRate?: number; // default 5%
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate?: Date;
  items: CreatePurchaseItemInput[];
}

export class PurchaseService {
  /**
   * Records a supplier purchase, adds purchase items, and updates raw-material stock automatically via the ledger.
   */
  static async recordPurchase(input: CreatePurchaseInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Generate purchase order sequence
      const count = await tx.purchase.count();
      const date = input.purchaseDate || new Date();
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      const purchaseNumber = `PO-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

      // Calculate totals
      let totalAmount = 0;
      const preparedItems = [];

      for (const itemInput of input.items) {
        const qty = roundQuantity(itemInput.quantity).toNumber();
        const rate = roundMoney(itemInput.rate).toNumber();
        const taxRate = itemInput.taxRate ?? 5.0;
        const lineTaxable = roundMoney(qty * rate).toNumber();
        const lineTax = roundMoney((lineTaxable * taxRate) / 100).toNumber();
        const lineTotal = roundMoney(lineTaxable + lineTax).toNumber();

        totalAmount += lineTotal;

        preparedItems.push({
          itemId: itemInput.itemId,
          quantity: qty,
          rate,
          ratePaisa: Math.round(rate * 100),
          taxRate,
          taxAmount: lineTax,
          totalAmount: lineTotal,
          totalPaisa: Math.round(lineTotal * 100),
        });
      }

      totalAmount = roundMoney(totalAmount).toNumber();

      // 2. Insert Purchase record
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: input.supplierId,
          purchaseDate: date,
          totalAmount,
          totalPaisa: Math.round(totalAmount * 100),
          status: 'RECEIVED',
          items: {
            create: preparedItems,
          },
        },
        include: {
          items: {
            include: { item: true },
          },
          supplier: true,
        },
      });

      // 3. Atomically update inventory ledger for each received item
      for (const pItem of purchase.items) {
        await InventoryService.recordMovement({
          itemId: pItem.itemId,
          transactionType: 'PURCHASE_RECEIPT',
          sourceDocType: 'PURCHASE',
          sourceDocId: purchase.purchaseNumber,
          quantityChange: pItem.quantity,
          unitRate: pItem.rate,
          notes: `Purchase from ${purchase.supplier.name} under ${purchase.purchaseNumber}`,
          tx,
        });
      }

      return purchase;
    });
  }

  /**
   * List all purchases for purchase register report.
   */
  static async getPurchaseRegister(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = startDate;
      if (endDate) where.purchaseDate.lte = endDate;
    }

    return await prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: { item: true },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });
  }
}
