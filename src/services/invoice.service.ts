import { prisma } from '../lib/db';
import { InventoryService } from './inventory.service';
import { calculateGST, formatInvoiceNumber } from '../lib/gst';
import { roundMoney, Decimal } from '../lib/decimal';

export interface CreateInvoiceInput {
  salesOrderId: string;
  invoiceDate?: Date;
  adminUserId?: string;
}

export interface RecordPaymentInput {
  customerId: string;
  invoiceId: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  notes?: string;
}

export class InvoiceService {
  /**
   * Raises a GST-compliant tax invoice from an approved sales order.
   * Calculates CGST+SGST (intra-state) or IGST (inter-state) based on Place of Supply.
   * Generates sequential financial-year invoice numbering (INV/YYYY-YY/XXXX).
   */
  static async createInvoiceFromOrder(input: CreateInvoiceInput) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUniqueOrThrow({
        where: { id: input.salesOrderId },
        include: {
          customer: true,
          items: { include: { item: true } },
          invoice: true,
        },
      });

      if (order.invoice) {
        throw new Error(`Order ${order.orderNumber} has already been invoiced (${order.invoice.invoiceNumber}).`);
      }

      const date = input.invoiceDate || new Date();
      const count = await tx.invoice.count();
      const invoiceNumber = formatInvoiceNumber(count + 1, date);

      // Calculate Place of Supply GST
      const customerStateCode = order.customer.stateCode;
      const gstSummary = calculateGST(order.totalAmount, customerStateCode, 5.0);

      // Create Invoice Header
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          salesOrderId: order.id,
          customerId: order.customerId,
          invoiceDate: date,
          factoryStateCode: '33',
          placeOfSupplyStateCode: customerStateCode,
          isInterState: gstSummary.isInterState,
          taxableAmount: gstSummary.taxableAmount.toNumber(),
          taxablePaisa: Math.round(gstSummary.taxableAmount.times(100).toNumber()),
          cgstAmount: gstSummary.cgstAmount.toNumber(),
          cgstPaisa: Math.round(gstSummary.cgstAmount.times(100).toNumber()),
          sgstAmount: gstSummary.sgstAmount.toNumber(),
          sgstPaisa: Math.round(gstSummary.sgstAmount.times(100).toNumber()),
          igstAmount: gstSummary.igstAmount.toNumber(),
          igstPaisa: Math.round(gstSummary.igstAmount.times(100).toNumber()),
          grandTotal: gstSummary.grandTotal.toNumber(),
          grandPaisa: Math.round(gstSummary.grandTotal.times(100).toNumber()),
          paymentStatus: 'UNPAID',
          dispatchStatus: 'PENDING',
        },
      });

      // Create Invoice Items
      for (const orderItem of order.items) {
        const itemTaxable = roundMoney(orderItem.approvedQty * orderItem.unitPrice).toNumber();
        const itemTax = calculateGST(itemTaxable, customerStateCode, orderItem.item.gstRate);

        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            itemId: orderItem.itemId,
            hsnCode: orderItem.item.hsnCode,
            quantity: orderItem.approvedQty,
            unitPrice: orderItem.unitPrice,
            pricePaisa: Math.round(orderItem.unitPrice * 100),
            taxable: itemTaxable,
            taxablePaisa: Math.round(itemTaxable * 100),
            cgstRate: itemTax.cgstRate.toNumber(),
            cgstAmount: itemTax.cgstAmount.toNumber(),
            sgstRate: itemTax.sgstRate.toNumber(),
            sgstAmount: itemTax.sgstAmount.toNumber(),
            igstRate: itemTax.igstRate.toNumber(),
            igstAmount: itemTax.igstAmount.toNumber(),
            totalAmount: itemTax.grandTotal.toNumber(),
            totalPaisa: Math.round(itemTax.grandTotal.times(100).toNumber()),
          },
        });
      }

      // Update Sales Order status
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'INVOICED' },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          entityName: 'Invoice',
          entityId: invoice.id,
          action: 'CREATE',
          newValues: JSON.stringify({
            invoiceNumber,
            grandTotal: gstSummary.grandTotal.toNumber(),
          }),
          performedBy: input.adminUserId,
        },
      });

      return await tx.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: {
          customer: true,
          items: { include: { item: true } },
          salesOrder: true,
        },
      });
    });
  }

  /**
   * Records dispatch of invoiced goods.
   * Atomically decreases finished goods stock via the Inventory Ledger.
   */
  static async recordDispatch(invoiceId: string, adminUserId?: string) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: {
          customer: true,
          items: { include: { item: true } },
          salesOrder: true,
        },
      });

      if (invoice.dispatchStatus === 'DISPATCHED') {
        throw new Error(`Invoice ${invoice.invoiceNumber} has already been dispatched.`);
      }

      // Deduct finished goods for every invoice line item
      for (const lineItem of invoice.items) {
        await InventoryService.recordMovement({
          itemId: lineItem.itemId,
          transactionType: 'SALES_DISPATCH',
          sourceDocType: 'INVOICE',
          sourceDocId: invoice.invoiceNumber,
          quantityChange: -lineItem.quantity,
          unitRate: lineItem.unitPrice,
          notes: `Sales dispatch to ${invoice.customer.name} under ${invoice.invoiceNumber}`,
          tx,
        });
      }

      // Update invoice and order dispatch status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          dispatchStatus: 'DISPATCHED',
          dispatchDate: new Date(),
        },
        include: {
          customer: true,
          items: { include: { item: true } },
        },
      });

      await tx.salesOrder.update({
        where: { id: invoice.salesOrderId },
        data: { status: 'DISPATCHED' },
      });

      await tx.auditLog.create({
        data: {
          entityName: 'Invoice',
          entityId: invoiceId,
          action: 'UPDATE',
          newValues: JSON.stringify({ dispatchStatus: 'DISPATCHED' }),
          performedBy: adminUserId,
        },
      });

      return updatedInvoice;
    });
  }

  /**
   * Records a payment against an invoice and updates customer receivables balance.
   */
  static async recordPayment(input: RecordPaymentInput) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { payments: true },
      });

      const count = await tx.paymentReceipt.count();
      const date = new Date();
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      const receiptNumber = `REC-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

      const paymentAmt = roundMoney(input.amount).toNumber();

      const receipt = await tx.paymentReceipt.create({
        data: {
          receiptNumber,
          customerId: input.customerId,
          invoiceId: input.invoiceId,
          paymentDate: date,
          paymentMode: input.paymentMode,
          amountReceived: paymentAmt,
          amountPaisa: Math.round(paymentAmt * 100),
          notes: input.notes,
        },
      });

      // Calculate total paid including this receipt
      const totalPaidSoFar = invoice.payments.reduce(
        (sum, p) => sum.plus(new Decimal(p.amountReceived)),
        new Decimal(paymentAmt)
      );

      const invoiceGrandTotal = new Decimal(invoice.grandTotal);
      let newPaymentStatus = 'PARTIALLY_PAID';

      if (totalPaidSoFar.greaterThanOrEqualTo(invoiceGrandTotal)) {
        newPaymentStatus = 'PAID';
      } else if (totalPaidSoFar.isZero()) {
        newPaymentStatus = 'UNPAID';
      }

      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: { paymentStatus: newPaymentStatus },
      });

      const remainingOutstanding = invoiceGrandTotal.minus(totalPaidSoFar).toNumber();

      return {
        receipt,
        totalPaid: totalPaidSoFar.toNumber(),
        remainingOutstanding,
        paymentStatus: newPaymentStatus,
      };
    });
  }

  /**
   * Get customer outstanding receivables with ageing analysis.
   */
  static async getCustomerReceivables() {
    const customers = await prisma.customer.findMany({
      include: {
        invoices: {
          where: { isCancelled: false },
          include: { payments: true },
        },
      },
    });

    const now = new Date();

    return customers.map((c) => {
      let totalBilled = new Decimal(0);
      let totalReceived = new Decimal(0);
      let totalOutstanding = new Decimal(0);

      let aging0To30 = new Decimal(0);
      let aging31To60 = new Decimal(0);
      let agingOver60 = new Decimal(0);

      for (const inv of c.invoices) {
        const invTotal = new Decimal(inv.grandTotal);
        const invPaid = inv.payments.reduce(
          (sum, p) => sum.plus(new Decimal(p.amountReceived)),
          new Decimal(0)
        );
        const invDue = invTotal.minus(invPaid);

        totalBilled = totalBilled.plus(invTotal);
        totalReceived = totalReceived.plus(invPaid);

        if (invDue.greaterThan(0)) {
          totalOutstanding = totalOutstanding.plus(invDue);
          const ageDays = Math.floor(
            (now.getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (ageDays <= 30) {
            aging0To30 = aging0To30.plus(invDue);
          } else if (ageDays <= 60) {
            aging31To60 = aging31To60.plus(invDue);
          } else {
            agingOver60 = agingOver60.plus(invDue);
          }
        }
      }

      return {
        customerId: c.id,
        customerName: c.name,
        customerType: c.customerType,
        state: c.state,
        totalBilled: totalBilled.toNumber(),
        totalReceived: totalReceived.toNumber(),
        totalOutstanding: totalOutstanding.toNumber(),
        aging0To30: aging0To30.toNumber(),
        aging31To60: aging31To60.toNumber(),
        agingOver60: agingOver60.toNumber(),
        invoices: c.invoices,
      };
    });
  }
}
