export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page?: number;
    limit: number;
    offset?: number;
    totalPages?: number;
  };
}
