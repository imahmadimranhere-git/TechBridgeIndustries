import { format, isValid } from 'date-fns';
import { formatMoney, formatPercent } from '../utils/money.js';

/**
 * Small functions usable inside .hbs templates, e.g.
 *   {{money total}}  {{date invoiceDate}}  {{date issuedAt "dd MMM yyyy, hh:mm a"}}
 * Shared by PDF templates (and email templates in Phase 13).
 */
export function registerHelpers(hbs) {
  // Uses the currency symbol from settings (available as branding.currencySymbol)
  hbs.registerHelper('money', (minor, options) =>
    formatMoney(minor ?? 0, { symbol: options?.data?.root?.branding?.currencySymbol ?? 'Rs' })
  );

  hbs.registerHelper('moneyPlain', (minor) => formatMoney(minor ?? 0, { symbol: '' }));

  hbs.registerHelper('date', (value, pattern) => {
    const date = value ? new Date(value) : null;
    if (!date || !isValid(date)) return '';
    return format(date, typeof pattern === 'string' ? pattern : 'dd MMM yyyy');
  });

  hbs.registerHelper('percent', (value) => formatPercent(value));
  hbs.registerHelper('eq', (a, b) => a === b);
  hbs.registerHelper('inc', (value) => Number(value) + 1);
  hbs.registerHelper('upper', (text) => String(text ?? '').toUpperCase());

  // First truthy value: {{or client.companyName client.name}}
  hbs.registerHelper('or', (...args) => args.slice(0, -1).find(Boolean) ?? '');

  // Escapes the text first, THEN turns line breaks into <br> (safe for user-written notes)
  hbs.registerHelper(
    'nl2br',
    (text) => new hbs.SafeString(hbs.Utils.escapeExpression(text ?? '').replace(/\r?\n/g, '<br>'))
  );
}