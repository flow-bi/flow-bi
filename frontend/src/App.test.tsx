import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

import type { MeetingRoomGateway } from './features/meeting-room'

afterEach(() => {
  delete window.__FLOW_BI_MEETING_ROOM_GATEWAY__
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('App main screen', () => {
  it.each([
    ['/', true, '비밀번호 변경', '/password-change'],
    ['/password-change', false, '콘텐츠', '/'],
    ['/unknown', false, '콘텐츠', '/'],
  ])(
    'normalizes %s from the server session state',
    async (requestedPath, mustChangePassword, heading, expectedPath) => {
      window.history.replaceState({}, '', requestedPath)
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ authenticated: true, mustChangePassword }), {
            status: 200,
          }),
        ),
      )
      render(<App />)
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
      expect(window.location.pathname).toBe(expectedPath)
    },
  )

  it('uses a retryable error screen for a session 503 and login for a 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    const { unmount } = render(<App />)
    expect(
      await screen.findByRole('heading', { name: '인증 상태를 확인할 수 없습니다' }),
    ).toBeInTheDocument()
    unmount()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    render(<App />)
    expect(await screen.findByRole('heading', { name: '로그인' })).toHaveFocus()
  })

  it('rechecks server state after browser back or forward navigation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: true }), {
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: '콘텐츠' })
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/password-change')
  })

  it('keeps the existing shell available only for a normal authenticated session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      ),
    )
    render(<App />)
    expect(await screen.findByRole('banner')).toHaveTextContent('Flow BI')
    expect(screen.getByRole('main', { name: '콘텐츠' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '콘텐츠' })).toHaveFocus()
    expect(screen.getByRole('heading', { name: '회의실 예약 현황' })).toBeInTheDocument()
  })

  it('places the meeting-room screen inside the global application shell', async () => {
    const gateway: MeetingRoomGateway = {
      findAvailability: vi.fn().mockResolvedValue({ rooms: [] }),
    }
    window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = gateway

    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Flow BI')
    expect(screen.getByRole('navigation', { name: '주요 탐색' })).toHaveTextContent('회의실')
    expect(await screen.findByRole('heading', { name: '회의실 예약 현황' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: '콘텐츠' })).toContainElement(
      screen.getByRole('heading', { name: '회의실 예약 현황' }),
    )
  })

  it('opens and closes the mobile sidebar with Escape and restores focus to its trigger', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      ),
    )
    const user = userEvent.setup()
    render(<App />)
    const openButton = await screen.findByRole('button', { name: '사이드바 열기' })
    await user.click(openButton)
    expect(screen.getByRole('dialog', { name: '주요 탐색' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '주요 탐색' })).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })
})
