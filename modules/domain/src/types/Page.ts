export interface PageRequest {
  page: number;
  size: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean | null;
  hasPrevious: boolean | null;
}
