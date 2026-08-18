import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../App'

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
})

describe('App authentication guard', () => {
  it.each([
    [{ authenticated: true, mustChangePassword: true }, '비밀번호 변경'],
    [{ authenticated: true, mustChangePassword: false }, 'Flow BI'],
  ])('routes authenticated server state to %s', async (session, heading) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(session), { status: 200 })),
    )

    render(<App />)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('returns to login after logout and does not retain the protected screen', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-value; Path=/'
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Flow BI' })).not.toBeInTheDocument()
  })

  it('logs out from the forced password-change screen after the CSRF bootstrap request', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-value; Path=/'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: true }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '비밀번호 변경' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/csrf', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/auth/logout', {
      credentials: 'include',
      headers: { 'X-XSRF-TOKEN': 'csrf-value' },
      method: 'POST',
    })
  })

  it('keeps the forced password-change screen and shows a logout failure', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-value; Path=/'
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ authenticated: true, mustChangePassword: true }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그아웃할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    )
    expect(screen.getByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument()
  })

  it('uses the login page for expired sessions and an explicit recovery page for session service failure', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const { unmount } = render(<App />)

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    unmount()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: '인증 상태를 확인할 수 없습니다' }),
    ).toBeInTheDocument()
  })
})
