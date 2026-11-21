import Decimal from 'decimal.js';

// Configure Decimal precision and rounding mode for financial correctness
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Formats a decimal/number as Indian Rupee currency (e.g. ₹7,875.00)
 */
export function formatCurrency(value: Decimal.Value | null | undefined): string {
  if (value === null || value === undefined) return '₹0.00';
  const dec = new Decimal(value);
  const fixed = dec.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  
  // Format integer part with Indian numbering system (xx,xx,xxx)
  const lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  const formattedInt = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree 
    : lastThree;

  return `₹${formattedInt}.${decPart}`;
}

/**
 * Formats quantity with appropriate decimal points based on UOM
 */
export function formatQuantity(value: Decimal.Value | null | undefined, uom: string = ''): string {
  if (value === null || value === undefined) return '0';
  const dec = new Decimal(value);
  const formatted = dec.toNumber().toLocaleString('en-IN', {
    maximumFractionDigits: 3,
    minimumFractionDigits: dec.decimalPlaces() > 0 ? 1 : 0
  });
  return uom ? `${formatted} ${uom}` : formatted;
}

/**
 * Rounds a monetary amount strictly to 2 decimal places
 */
export function roundMoney(amount: Decimal.Value): Decimal {
  return new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Rounds a quantity strictly to 3 decimal places (e.g. 10.500 L)
 */
export function roundQuantity(qty: Decimal.Value): Decimal {
  return new Decimal(qty).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

/**
 * Calculate variance percentage: ((actual - planned) / planned) * 100
 */
export function calculateVariancePercentage(actual: Decimal.Value, planned: Decimal.Value): {
  varianceQty: Decimal;
  variancePercent: Decimal;
  isAdverse: boolean;
  exceedsTolerance: boolean;
} {
  const actualDec = new Decimal(actual);
  const plannedDec = new Decimal(planned);
  const varianceQty = actualDec.minus(plannedDec);
  
  if (plannedDec.isZero()) {
    return {
      varianceQty,
      variancePercent: new Decimal(0),
      isAdverse: false,
      exceedsTolerance: false
    };
  }

  const variancePercent = varianceQty.dividedBy(plannedDec).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  // Tolerance check (3%)
  const exceedsTolerance = variancePercent.abs().greaterThan(3.0);
  // Adverse means actual > planned for consumption, or actual < planned for yield
  const isAdverse = exceedsTolerance;

  return {
    varianceQty,
    variancePercent,
    isAdverse,
    exceedsTolerance
  };
}
