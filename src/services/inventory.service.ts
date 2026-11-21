import { prisma } from '../lib/db';
import { Prisma } from '@prisma/client';
import { roundQuantity } from '../lib/decimal';

export type TransactionType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIPT'
  | 'PRODUCTION_ISSUE'
  | 'PRODUCTION_YIELD'
  | 'SALES_DISPATCH'
  | 'DAMAGED_SCRAP'
  | 'STOCK_ADJUSTMENT';

export type SourceDocType =
  | 'INITIAL'
  | 'PURCHASE'
  | 'PRODUCTION_RUN'
  | 'INVOICE'
  | 'ADJUSTMENT';

export interface RecordMovementParams {
  itemId: string;
  transactionType: TransactionType;
  sourceDocType: SourceDocType;
  sourceDocId: string;
  quantityChange: number; // positive for receipt/yield, negative for issue/dispatch
  unitRate?: number;
  notes?: string;
  createdById?: string;
  tx?: Prisma.TransactionClient;
}

export class InventoryService {
  /**
   * Records an immutable stock movement and updates the item's current stock snapshot.
   * Can run inside an existing Prisma transaction or independently.
   */
  static async recordMovement(params: RecordMovementParams) {
    const client = params.tx || prisma;
    const roundedQtyChange = roundQuantity(params.quantityChange).toNumber();

    // 1. Fetch current item stock
    const item = await client.item.findUniqueOrThrow({
      where: { id: params.itemId },
    });

    const newBalance = roundQuantity(item.currentStock + roundedQtyChange).toNumber();

    // Prevent negative stock for dispatches / issues unless adjustment
    if (newBalance < 0 && roundedQtyChange < 0) {
      throw new Error(
        `Insufficient stock for item "${item.name}" (${item.code}). Current stock: ${item.currentStock} ${item.uom}, requested deduction: ${Math.abs(roundedQtyChange)} ${item.uom}. Shortage: ${Math.abs(newBalance)} ${item.uom}.`
      );
    }

    // 2. Create append-only ledger movement
    const ledgerEntry = await client.inventoryLedger.create({
      data: {
        itemId: params.itemId,
        transactionType: params.transactionType,
        sourceDocType: params.sourceDocType,
        sourceDocId: params.sourceDocId,
        quantityChange: roundedQtyChange,
        balanceAfter: newBalance,
        unitRate: params.unitRate ?? item.valuationRate,
        notes: params.notes,
        createdById: params.createdById,
      },
    });

    // 3. Update the cached currentStock and valuation on Item
    await client.item.update({
      where: { id: params.itemId },
      data: {
        currentStock: newBalance,
        ...(params.unitRate && params.quantityChange > 0
          ? { valuationRate: params.unitRate }
          : {}),
      },
    });

    return ledgerEntry;
  }

  /**
   * Get real-time stock balances categorized by Raw Materials, Packaging, and Finished Goods.
   */
  static async getStockSummary() {
    const items = await prisma.item.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        ledgerMovements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Reconcile and calculate stats for each item
    const summary = await Promise.all(
      items.map(async (item) => {
        // Calculate total receipts and issues from the immutable ledger
        const ledgerStats = await prisma.inventoryLedger.aggregate({
          where: { itemId: item.id },
          _sum: {
            quantityChange: true,
          },
        });

        const ledgerCalculatedBalance = roundQuantity(
          ledgerStats._sum.quantityChange || 0
        ).toNumber();

        return {
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.category,
          uom: item.uom,
          hsnCode: item.hsnCode,
          currentStock: item.currentStock,
          reconciledBalance: ledgerCalculatedBalance,
          valuationRate: item.valuationRate,
          stockValue: roundQuantity(item.currentStock * item.valuationRate).toNumber(),
          minReorderLevel: item.minReorderLevel,
          isLowStock: item.currentStock <= item.minReorderLevel,
          lastMovement: item.ledgerMovements[0] || null,
        };
      })
    );

    return summary;
  }

  /**
   * Get full traceable movement history for an item.
   */
  static async getItemLedger(itemId: string) {
    const item = await prisma.item.findUniqueOrThrow({
      where: { id: itemId },
    });

    const movements = await prisma.inventoryLedger.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      item,
      movements,
    };
  }
}
