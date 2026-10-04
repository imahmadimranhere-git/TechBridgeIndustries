const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );

/**
 * Fills {placeholders} in the welcome letter written in Settings and splits it into paragraphs.
 * The template AND every value are HTML-escaped first, so the result is safe to print with {{{ }}}.
 * Unknown placeholders are left as they are, so a typo is visible instead of silently disappearing.
 */
export function fillLetterTemplate(template, values) {
  const filled = escapeHtml(template).replace(/\{([a-z_]+)\}/g, (match, key) =>
    key in values ? escapeHtml(values[key]) : match
  );

  return filled
    .split(/\r?\n\s*\r?\n/) // a blank line starts a new paragraph
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => paragraph.replace(/\r?\n/g, '<br>'));
}