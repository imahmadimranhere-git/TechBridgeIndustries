// "TechBridgeIndustries" -> "TBI", "Acme Traders" -> "AT" (same rule as the PDFs)
export function initialsOf(name = '') {
  const capitals = name.match(/[A-Z]/g);
  if (capitals && capitals.length >= 2) return capitals.slice(0, 3).join('');
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}