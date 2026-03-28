/**
 * API Request Helper
 *
 * 提供統一的 HTTP 請求介面，根據 specs/overview.md 的 API contract 設計。
 * Base URL 和 API prefix 可透過環境變數設定。
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: Record<string, string>;
  setCookie?: string[];
}

/**
 * 發送 HTTP 請求到 API
 */
async function request<T = any>(
  method: string,
  path: string,
  options: {
    body?: Record<string, any>;
    headers?: Record<string, string>;
    cookie?: string;
  } = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${API_PREFIX}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.cookie) {
    headers['Cookie'] = options.cookie;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    redirect: 'manual',
  };

  if (options.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  let body: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const setCookie = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : [];

  return {
    status: response.status,
    body,
    headers: responseHeaders,
    setCookie,
  };
}

/**
 * API Client - 提供 RESTful 方法
 */
export const api = {
  get: <T = any>(path: string, options?: { headers?: Record<string, string>; cookie?: string }) =>
    request<T>('GET', path, options),

  post: <T = any>(path: string, body?: Record<string, any>, options?: { headers?: Record<string, string>; cookie?: string }) =>
    request<T>('POST', path, { ...options, body }),

  put: <T = any>(path: string, body?: Record<string, any>, options?: { headers?: Record<string, string>; cookie?: string }) =>
    request<T>('PUT', path, { ...options, body }),

  patch: <T = any>(path: string, body?: Record<string, any>, options?: { headers?: Record<string, string>; cookie?: string }) =>
    request<T>('PATCH', path, { ...options, body }),

  delete: <T = any>(path: string, options?: { headers?: Record<string, string>; cookie?: string }) =>
    request<T>('DELETE', path, options),
};

/**
 * 從 Set-Cookie header 中提取 token cookie
 */
export function extractTokenCookie(setCookieHeaders: string[]): string | null {
  for (const cookie of setCookieHeaders) {
    if (cookie.startsWith('token=')) {
      return cookie.split(';')[0]; // 回傳 "token=xxx"
    }
  }
  return null;
}

/**
 * 驗證 Set-Cookie header 包含 HttpOnly flag
 */
export function hasHttpOnlyFlag(setCookieHeaders: string[]): boolean {
  for (const cookie of setCookieHeaders) {
    if (cookie.startsWith('token=') && cookie.toLowerCase().includes('httponly')) {
      return true;
    }
  }
  return false;
}

/**
 * 驗證 Set-Cookie header 設定 Max-Age=0（用於登出）
 */
export function hasMaxAgeZero(setCookieHeaders: string[]): boolean {
  for (const cookie of setCookieHeaders) {
    if (cookie.startsWith('token=') && cookie.includes('Max-Age=0')) {
      return true;
    }
  }
  return false;
}
