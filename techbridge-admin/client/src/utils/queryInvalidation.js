// Everything that shows money. After a payment, invoice or deal changes, all of it is refreshed.
const MONEY_KEYS = ['payments', 'deals', 'deal', 'invoices', 'invoice', 'clients', 'client', 'client-options', 'deal-options', 'invoice-options', 'staff', 'payouts', 'dashboard', 'reports'];

export function invalidateMoneyQueries(queryClient) {
  MONEY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}