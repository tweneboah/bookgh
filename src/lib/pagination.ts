import { type Query } from "mongoose";

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function parsePagination(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const sort = searchParams.get("sort") || undefined;
  return { page, limit, sort };
}

export function parseSortString(
  sort: string | undefined,
  allowed: string[]
): Record<string, 1 | -1> {
  if (!sort) return { createdAt: -1 };

  const result: Record<string, 1 | -1> = {};
  for (const part of sort.split(",")) {
    const desc = part.startsWith("-");
    const field = desc ? part.slice(1) : part;
    if (allowed.includes(field)) {
      result[field] = desc ? -1 : 1;
    }
  }
  return Object.keys(result).length ? result : { createdAt: -1 };
}

export async function paginate<T>(
  query: Query<T[], T>,
  countQuery: Query<number, T>,
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { page, limit } = params;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    query.skip(skip).limit(limit).lean<T[]>(),
    countQuery,
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
