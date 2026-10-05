import { safeMinor } from './formatMoney.js';

/**
 * Live invoice totals while the admin types. Mirrors Invoice.recalculateTotals on the server,
 * so the preview shows exactly what will be saved (the server still recalculates).
 */
export function calculateInvoiceTotals(items = [], discountInput = '', taxInput = '') {
  let subtotal = 0;
  const amounts = items.map((item) => {
    const qty = Number(item?.qty) || 0;
    const rate = safeMinor(item?.rate) ?? 0;
    const amount = Math.round(qty * rate);
    subtotal += amount;
    return amount;
  });

  const discount = Math.min(Math.max(safeMinor(discountInput) ?? 0, 0), subtotal);
  const taxPercent = Number(taxInput) || 0;
  const taxable = subtotal - discount;
  const taxAmount = Math.round((taxable * taxPercent) / 100);

  return { amounts, subtotal, discount, taxPercent, taxAmount, total: taxable + taxAmount };
}