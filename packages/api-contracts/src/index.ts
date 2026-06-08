export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export function ok<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

export function fail<T>(error: string): ApiResult<T> {
  return { success: false, error };
}
