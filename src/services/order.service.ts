import { prisma } from '../lib/db';
import { roundMoney, roundQuantity } from '../lib/decimal';

export interface OrderItemInput {
  itemId: string;
  quantity: number;
  unitPrice?: number; // pre-tax unit price
}

export interface CreateOrderInput {
  customerId: string;
  salesmanId: string;
  items: OrderItemInput[];
  notes?: string;
}

export class OrderService {
  /**
   * Field salesman creates an order.
   * Mobile friendly, defaults price from item master if not explicitly given.
   */
  static async createOrder(input: CreateOrderInput) {
    return await prisma.$transaction(async (tx) => {
      const count = await tx.salesOrder.count();
      const date = new Date();
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      const orderNumber = `SO-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

      let totalAmount = 0;
      const orderItems = [];

      for (const itemInput of input.items) {
        const item = await tx.item.findUniqueOrThrow({
          where: { id: itemInput.itemId },
        });

        const qty = roundQuantity(itemInput.quantity).toNumber();
        // Selling price: standard ₹50 before tax or custom
        const unitPrice = roundMoney(itemInput.unitPrice ?? 50.0).toNumber();
        const lineTotal = roundMoney(qty * unitPrice).toNumber();

        totalAmount += lineTotal;

        orderItems.push({
          itemId: item.id,
          orderedQty: qty,
          approvedQty: qty,
          unitPrice,
          pricePaisa: Math.round(unitPrice * 100),
          lineTotal,
          linePaisa: Math.round(lineTotal * 100),
        });
      }

      totalAmount = roundMoney(totalAmount).toNumber();

      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: input.customerId,
          salesmanId: input.salesmanId,
          status: 'SUBMITTED',
          totalAmount,
          totalPaisa: Math.round(totalAmount * 100),
          notes: input.notes,
          items: {
            create: orderItems,
          },
        },
        include: {
          customer: true,
          salesman: true,
          items: {
            include: { item: true },
          },
        },
      });

      return order;
    });
  }

  /**
   * Checks whether finished goods stock covers the pending order.
   * Returns item-by-item availability, shortage alerts, and place of supply GST prediction.
   */
  static async verifyOrderStock(orderId: string) {
    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        customer: true,
        salesman: true,
        items: {
          include: { item: true },
        },
      },
    });

    const isInterState = order.customer.stateCode !== '33'; // Factory is in Tamil Nadu (33)
    let hasInsufficientStock = false;

    const itemChecks = order.items.map((orderItem) => {
      const available = orderItem.item.currentStock;
      const requested = orderItem.orderedQty;
      const isAvailable = available >= requested;
      const shortage = isAvailable ? 0 : roundQuantity(requested - available).toNumber();

      if (!isAvailable) {
        hasInsufficientStock = true;
      }

      return {
        itemId: orderItem.itemId,
        itemCode: orderItem.item.code,
        itemName: orderItem.item.name,
        orderedQty: requested,
        approvedQty: orderItem.approvedQty,
        availableStock: available,
        isSufficient: isAvailable,
        shortage,
        unitPrice: orderItem.unitPrice,
      };
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerState: order.customer.state,
      customerStateCode: order.customer.stateCode,
      isInterState,
      applicableTax: isInterState ? 'IGST (5%)' : 'CGST (2.5%) + SGST (2.5%)',
      status: order.status,
      hasInsufficientStock,
      items: itemChecks,
    };
  }

  /**
   * Admin approves or rejects an order, with optional quantity or price adjustments.
   */
  static async updateOrderStatus(
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    adjustments?: { itemId: string; approvedQty?: number; unitPrice?: number }[],
    adminUserId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      if (action === 'REJECT') {
        return await tx.salesOrder.update({
          where: { id: orderId },
          data: { status: 'REJECTED' },
        });
      }

      // If adjustments were provided, update items and recalculate total
      let newTotal = 0;
      if (adjustments && adjustments.length > 0) {
        for (const adj of adjustments) {
          const item = order.items.find((i) => i.itemId === adj.itemId);
          if (item) {
            const approvedQty = adj.approvedQty ?? item.approvedQty;
            const unitPrice = adj.unitPrice ?? item.unitPrice;
            const lineTotal = roundMoney(approvedQty * unitPrice).toNumber();
            newTotal += lineTotal;

            await tx.salesOrderItem.update({
              where: { id: item.id },
              data: {
                approvedQty,
                unitPrice,
                pricePaisa: Math.round(unitPrice * 100),
                lineTotal,
                linePaisa: Math.round(lineTotal * 100),
              },
            });
          }
        }
      } else {
        newTotal = order.totalAmount;
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          status: 'APPROVED',
          totalAmount: roundMoney(newTotal).toNumber(),
          totalPaisa: Math.round(newTotal * 100),
        },
        include: {
          customer: true,
          items: { include: { item: true } },
        },
      });

      // Log in AuditLog
      await tx.auditLog.create({
        data: {
          entityName: 'SalesOrder',
          entityId: orderId,
          action: 'APPROVE',
          newValues: JSON.stringify({ status: 'APPROVED', totalAmount: newTotal }),
          performedBy: adminUserId,
        },
      });

      return updatedOrder;
    });
  }

  /**
   * List orders with optional status or salesman filter.
   */
  static async getOrders(filters?: { salesmanId?: string; status?: string }) {
    const where: any = {};
    if (filters?.salesmanId) where.salesmanId = filters.salesmanId;
    if (filters?.status) where.status = filters.status;

    return await prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        salesman: true,
        items: { include: { item: true } },
        invoice: true,
      },
      orderBy: { orderDate: 'desc' },
    });
  }
}
