const unauthenticatedListeners = new Set<() => void>()

export function onUnauthenticated(listener: () => void): () => void {
  unauthenticatedListeners.add(listener)
  return () => unauthenticatedListeners.delete(listener)
}

function csrfToken(): string | undefined {
  const cookie = document.cookie
    .split('; ')
    .find((candidate) => candidate.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : undefined
}

export function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const token = method === 'GET' || method === 'HEAD' ? undefined : csrfToken()
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...init.headers,
      ...(token ? { 'X-XSRF-TOKEN': token } : {}),
    },
  }).then((response) => {
    if (response.status === 401) {
      unauthenticatedListeners.forEach((listener) => listener())
    }
    return response
  })
}
