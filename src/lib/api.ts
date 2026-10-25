export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

let onUnauthorized: (() => void) | null = null
/** Вызывается, когда сервер ответил 401 (сессия истекла) */
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

async function request<T>(method: string, url: string, body?: unknown, raw?: { data: Blob; type: string }): Promise<T> {
  const headers: Record<string, string> = { 'x-requested-with': 'inventum' }
  let payload: BodyInit | undefined
  if (raw) {
    headers['content-type'] = raw.type
    payload = raw.data
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`/api${url}`, { method, headers, body: payload, credentials: 'same-origin' })
  if (!res.ok) {
    let message = 'Ошибка сервера'
    try {
      message = ((await res.json()) as { error?: string }).error ?? message
    } catch {
      /* не JSON */
    }
    if (res.status === 401 && url !== '/auth/login' && url !== '/auth/me') onUnauthorized?.()
    throw new ApiError(res.status, message)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T = unknown>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T = unknown>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  patch: <T = unknown>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  del: <T = unknown>(url: string) => request<T>('DELETE', url),
  upload: <T = unknown>(url: string, data: Blob) => request<T>('PUT', url, undefined, { data, type: data.type }),
}
