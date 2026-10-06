export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** White or dark text, whichever is readable on the given background colour */
export function contrastText(hex) {
  if (!HEX_COLOR.test(hex ?? '')) return '#ffffff';
  const value = hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? '#111827' : '#ffffff';
}