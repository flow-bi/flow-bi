import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../App'

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('Calendar session boundary', () => {
  it('returns to login after a calendar 401 but keeps the calendar error for a 404', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2026-08-10')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }))

    const { unmount } = render(<App />)

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    unmount()

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
    render(<App />)

    expect(
      await screen.findByText('일정을 불러오지 못했습니다. 다시 시도해 주세요.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '로그인' })).not.toBeInTheDocument()
  })
})
