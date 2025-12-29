// Currency formatting and validation utilities

export function formatCurrency(amount: number, currencySymbol: string): string {
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currencySymbol}${formatted}`;
}

export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function validateAmount(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount)) return false;
  if (amount <= 0) return false;

  // Check for max 2 decimal places
  const decimalPart = amount.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 2) return false;

  return true;
}
