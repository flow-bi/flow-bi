import { afterEach, describe, expect, it, vi } from 'vitest'

import { changePassword, getSession, login, logout } from './api'

const credentials = {
  employeeNumber: ['TEST', 1001].join('-'),
  password: ['Synthetic', '!', 123].join(''),
}

describe('login API contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
  })

  it('bootstraps CSRF and sends the documented cookie-authenticated login request', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-value; Path=/'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ mustChangePassword: true }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(login(credentials)).resolves.toEqual({
      mustChangePassword: true,
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/login', {
      body: JSON.stringify(credentials),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'csrf-value',
      },
      method: 'POST',
    })
  })
})

describe('session, password, and logout API contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
  })

  it('uses server session state and sends CSRF-protected password and logout requests', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-value; Path=/'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: true }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ mustChangePassword: false }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSession()).resolves.toEqual({ authenticated: true, mustChangePassword: true })
    await expect(
      changePassword({ newPassword: 'Changed!1234', confirmation: 'Changed!1234' }),
    ).resolves.toEqual({ mustChangePassword: false })
    await expect(logout()).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/session', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/auth/password',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })
})
