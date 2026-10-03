// Makes user text safe inside a regular expression ("C++" or "(test" won't break the search)
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive "contains" search across several fields */
export function searchFilter(search, fields) {
  const term = search?.trim();
  if (!term) return {};
  const regex = new RegExp(escapeRegex(term), 'i');
  return { $or: fields.map((field) => ({ [field]: regex })) };
}