export interface PageSlice {
  page: number;
  totalPages: number;
  start: number;
  end: number;
}

/**
 * Resolve a 1-based page request against a total count. Returns null when the
 * page is out of range (the caller should respond 404). An empty collection
 * still has one valid page.
 */
export function paginate(total: number, page: number, pageSize: number): PageSlice | null {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (!Number.isInteger(page) || page < 1 || page > totalPages) return null;
  const start = (page - 1) * pageSize;
  return { page, totalPages, start, end: Math.min(start + pageSize, total) };
}
