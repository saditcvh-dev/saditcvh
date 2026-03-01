export interface Pagination {
  total: number;
  limit: number;
  page?: number;
  totalPages?: number;
  nextCursor?: number | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}
