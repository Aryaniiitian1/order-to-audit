import { Decimal, roundMoney } from './decimal';

export const FACTORY_STATE_CODE = '33'; // Tamil Nadu
export const FACTORY_STATE_NAME = 'Tamil Nadu';
export const FACTORY_GSTIN = '33AAAAA0000A1Z5';

export interface TaxCalculationResult {
  taxableAmount: Decimal;
  isInterState: boolean;
  gstRate: Decimal;
  cgstRate: Decimal;
  cgstAmount: Decimal;
  sgstRate: Decimal;
  sgstAmount: Decimal;
  igstRate: Decimal;
  igstAmount: Decimal;
  totalTaxAmount: Decimal;
  grandTotal: Decimal;
}

/**
 * Calculates GST based on place of supply and factory location.
 * Uses exact Decimal math with ROUND_HALF_UP.
 */
export function calculateGST(
  taxableAmount: Decimal.Value,
  customerStateCode: string,
  gstRatePercent: Decimal.Value = 5.0
): TaxCalculationResult {
  const taxable = roundMoney(taxableAmount);
  const gstRate = new Decimal(gstRatePercent);
  
  // Clean state codes (leading zeros if any, e.g. '33', '29')
  const cleanCustomerState = customerStateCode.trim().padStart(2, '0');
  const cleanFactoryState = FACTORY_STATE_CODE.trim().padStart(2, '0');

  const isInterState = cleanCustomerState !== cleanFactoryState;

  if (isInterState) {
    // Inter-State Supply (IGST only)
    const igstRate = gstRate;
    const igstAmount = roundMoney(taxable.times(igstRate).dividedBy(100));
    const cgstRate = new Decimal(0);
    const cgstAmount = new Decimal(0);
    const sgstRate = new Decimal(0);
    const sgstAmount = new Decimal(0);
    const totalTaxAmount = igstAmount;
    const grandTotal = taxable.plus(totalTaxAmount);

    return {
      taxableAmount: taxable,
      isInterState: true,
      gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTaxAmount,
      grandTotal
    };
  } else {
    // Intra-State Supply (CGST + SGST split equally)
    const cgstRate = gstRate.dividedBy(2);
    const sgstRate = gstRate.dividedBy(2);
    const cgstAmount = roundMoney(taxable.times(cgstRate).dividedBy(100));
    const sgstAmount = roundMoney(taxable.times(sgstRate).dividedBy(100));
    const igstRate = new Decimal(0);
    const igstAmount = new Decimal(0);
    const totalTaxAmount = cgstAmount.plus(sgstAmount);
    const grandTotal = taxable.plus(totalTaxAmount);

    return {
      taxableAmount: taxable,
      isInterState: false,
      gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTaxAmount,
      grandTotal
    };
  }
}

/**
 * Generates statutory GST invoice number for Indian Financial Year (April 1 to March 31)
 * Format: INV/YYYY-YY/XXXX (e.g. INV/2026-27/0001)
 */
export function formatInvoiceNumber(sequenceNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  // In India, FY starts April 1 (month 4)
  let startYear = year;
  let endYear = year + 1;
  if (month < 4) {
    startYear = year - 1;
    endYear = year;
  }
  
  const fyString = `${startYear}-${String(endYear).slice(-2)}`;
  const seqString = String(sequenceNumber).padStart(4, '0');
  return `INV/${fyString}/${seqString}`;
}
