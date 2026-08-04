export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

export function apiError(code: string, message: string): ApiResult<never> {
  return { success: false, code, message };
}
