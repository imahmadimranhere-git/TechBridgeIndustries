// Same formula as server/src/utils/commission.js
// percentage: rate is a number like 12.5; fixed: rate is an amount in paisa
export function commissionTotal(dealAmountMinor, type, rate) {
  if (!dealAmountMinor || !rate) return 0;
  if (type === 'fixed') return Math.round(rate);
  return Math.round((dealAmountMinor * rate) / 100);
}

export function commissionLabel(type, rate, formatMoney) {
  if (!rate) return 'No commission';
  return type === 'fixed' ? `${formatMoney(rate)} fixed` : `${rate}%`;
}