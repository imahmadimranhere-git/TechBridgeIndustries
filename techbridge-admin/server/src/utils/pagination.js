export function buildPagination(page, limit, total) {
  return { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) };
}

/** One page of documents + the total count, e.g. page 2 of clients with 20 per page */
export async function paginate(
  Model,
  filter = {},
  { page = 1, limit = 20, sort = { createdAt: -1, _id: -1 }, populate, select } = {}
) {
  let query = Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);

  const [items, total] = await Promise.all([query.lean(), Model.countDocuments(filter)]);
  return { items, pagination: buildPagination(page, limit, total) };
}

/** Same shape for rows that were already computed in memory (e.g. deal financials) */
export function paginateArray(rows, page = 1, limit = 20) {
  const start = (page - 1) * limit;
  return { items: rows.slice(start, start + limit), pagination: buildPagination(page, limit, rows.length) };
}