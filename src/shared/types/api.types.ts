export interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: unknown[];
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
