import { prisma } from '../lib/db';
import { InventoryService } from './inventory.service';
import { roundMoney, roundQuantity, calculateVariancePercentage } from '../lib/decimal';

export interface MaterialIssueInput {
  itemId: string;
  actualQty: number;
}

export interface RecordProductionRunInput {
  bomId: string;
  plannedBatches?: number; // default 1.0
  issuedMaterials: MaterialIssueInput[]; // Flour, Oil, Spice mix
  actualGoodOutput: number; // e.g. 188 packets
  damagedPouches?: number; // e.g. 6 damaged pouches
  cartonsUsed?: number; // e.g. 9 cartons
  notes?: string;
  supervisorId?: string;
}

export interface AddOverheadInput {
  productionRunId: string;
  overheads: {
    overheadType: 'LABOUR' | 'POWER_GAS' | 'MAINTENANCE' | 'OTHER';
    amount: number;
    notes?: string;
  }[];
}

export class ProductionService {
  /**
   * Executes a recipe-based production run.
   * Compares planned vs actual consumption, flags variances beyond tolerance (3%),
   * atomically deducts raw & packaging materials and credits finished goods stock.
   */
  static async recordProductionRun(input: RecordProductionRunInput) {
    return await prisma.$transaction(async (tx) => {
      const plannedBatches = input.plannedBatches ?? 1.0;

      // 1. Fetch BOM with standard items and finished good
      const bom = await tx.bOM.findUniqueOrThrow({
        where: { id: input.bomId },
        include: {
          items: {
            include: { rawItem: true },
          },
          finishedGoodItem: true,
        },
      });

      // 2. Generate Production Run sequence number (PR-YYYYMM-001)
      const count = await tx.productionRun.count();
      const date = new Date();
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      const runNumber = `PR-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

      // 3. Compute Yield Variance
      const expectedOutput = roundQuantity(bom.batchSize * plannedBatches).toNumber();
      const actualOutput = roundQuantity(input.actualGoodOutput).toNumber();
      const yieldVariance = calculateVariancePercentage(actualOutput, expectedOutput);

      // 4. Create Production Run Header
      const productionRun = await tx.productionRun.create({
        data: {
          runNumber,
          bomId: bom.id,
          finishedGoodItemId: bom.finishedGoodItemId,
          plannedBatches,
          expectedOutput,
          actualOutput,
          yieldVariancePercent: yieldVariance.variancePercent.toNumber(),
          yieldVarianceFlag: yieldVariance.exceedsTolerance,
          status: 'COMPLETED',
          runDate: date,
          supervisorId: input.supervisorId,
          notes: input.notes,
        },
      });

      // 5. Process Raw Materials & Packaging Consumptions
      // Map of issues passed by supervisor
      const issuedMap = new Map<string, number>();
      for (const issue of input.issuedMaterials) {
        issuedMap.set(issue.itemId, issue.actualQty);
      }

      // Track each BOM recipe item
      for (const bomItem of bom.items) {
        const plannedQty = roundQuantity(bomItem.standardQuantity * plannedBatches).toNumber();
        let actualQty = plannedQty;
        let damagedQty = 0;

        if (issuedMap.has(bomItem.rawItemId)) {
          // Explicit issue from floor
          actualQty = roundQuantity(issuedMap.get(bomItem.rawItemId)!).toNumber();
        } else if (bomItem.rawItem.code === 'PM-POUCH-200G') {
          // Pouches: actual good output + damaged pouches
          damagedQty = input.damagedPouches ?? 0;
          actualQty = roundQuantity(actualOutput + damagedQty).toNumber();
        } else if (bomItem.rawItem.code.includes('CARTON')) {
          // Cartons: explicitly entered or calculated
          actualQty = input.cartonsUsed ?? Math.ceil(actualOutput / 20);
        }

        const variance = calculateVariancePercentage(actualQty, plannedQty);

        // Record consumption detail
        await tx.productionConsumption.create({
          data: {
            productionRunId: productionRun.id,
            itemId: bomItem.rawItemId,
            plannedQty,
            actualQty,
            varianceQty: variance.varianceQty.toNumber(),
            variancePercent: variance.variancePercent.toNumber(),
            varianceFlag: variance.exceedsTolerance,
            damagedQty,
            notes: variance.exceedsTolerance
              ? `Adverse variance: ${variance.variancePercent.toString()}% (Planned: ${plannedQty} ${bomItem.uom}, Actual: ${actualQty} ${bomItem.uom})`
              : 'Within standard tolerance',
          },
        });

        // Deduct raw / packaging material from inventory ledger
        await InventoryService.recordMovement({
          itemId: bomItem.rawItemId,
          transactionType: damagedQty > 0 ? 'DAMAGED_SCRAP' : 'PRODUCTION_ISSUE',
          sourceDocType: 'PRODUCTION_RUN',
          sourceDocId: runNumber,
          quantityChange: -actualQty,
          notes: `Material issue for run ${runNumber} (${bomItem.rawItem.name})`,
          tx,
        });
      }

      // 6. Credit Finished Goods to Inventory Ledger
      await InventoryService.recordMovement({
        itemId: bom.finishedGoodItemId,
        transactionType: 'PRODUCTION_YIELD',
        sourceDocType: 'PRODUCTION_RUN',
        sourceDocId: runNumber,
        quantityChange: actualOutput,
        notes: `Finished goods manufactured in run ${runNumber} (${bom.finishedGoodItem.name})`,
        tx,
      });

      return await tx.productionRun.findUniqueOrThrow({
        where: { id: productionRun.id },
        include: {
          bom: true,
          finishedGoodItem: true,
          consumptions: {
            include: { item: true },
          },
          overheads: true,
        },
      });
    });
  }

  /**
   * Adds direct manufacturing overheads (Labour, Gas/Power) to a completed production run.
   */
  static async addOverheads(input: AddOverheadInput) {
    return await prisma.$transaction(async (tx) => {
      for (const ov of input.overheads) {
        const roundedAmount = roundMoney(ov.amount).toNumber();
        await tx.productionOverhead.create({
          data: {
            productionRunId: input.productionRunId,
            overheadType: ov.overheadType,
            amount: roundedAmount,
            amountPaisa: Math.round(roundedAmount * 100),
            notes: ov.notes,
          },
        });
      }

      return await tx.productionRun.findUniqueOrThrow({
        where: { id: input.productionRunId },
        include: {
          consumptions: { include: { item: true } },
          overheads: true,
          finishedGoodItem: true,
        },
      });
    });
  }

  /**
   * List production runs with detailed variance analysis.
   */
  static async getProductionRuns() {
    return await prisma.productionRun.findMany({
      include: {
        bom: true,
        finishedGoodItem: true,
        consumptions: {
          include: { item: true },
        },
        overheads: true,
        supervisor: true,
      },
      orderBy: { runDate: 'desc' },
    });
  }
}
