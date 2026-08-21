import { render, screen, waitFor, within } from '@testing-library/react'
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

function authenticatedFetchMock(name = '실제 사용자') {
  return vi.fn((path: string) => {
    if (path === '/api/me/header') {
      return Promise.resolve(new Response(JSON.stringify({ name }), { status: 200 }))
    }
    return Promise.resolve(
      new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
        status: 200,
      }),
    )
  })
}

describe('App main screen', () => {
  it.each([
    ['/', true, '비밀번호 변경', '/password-change'],
    ['/password-change', false, '회의실 예약 현황', '/'],
    ['/unknown', false, '회의실 예약 현황', '/'],
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
    let sessionRequestCount = 0
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.startsWith('/api/rooms?')) {
        return Promise.resolve(new Response(JSON.stringify({ rooms: [] }), { status: 200 }))
      }
      if (url === '/api/auth/session') {
        sessionRequestCount += 1
        return Promise.resolve(
          new Response(
            JSON.stringify({
              authenticated: true,
              mustChangePassword: sessionRequestCount > 1,
            }),
            { status: 200 },
          ),
        )
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('main', { name: '콘텐츠' })
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/password-change')
  })

  it('keeps the existing shell available only for a normal authenticated session', async () => {
    vi.stubGlobal('fetch', authenticatedFetchMock())
    render(<App />)
    expect(await screen.findByText('실제 사용자')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('Flow BI')
    expect(screen.getByRole('main', { name: '콘텐츠' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '콘텐츠' })).not.toBeInTheDocument()
    expect(screen.queryByText('로그인되었습니다.')).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('desktop-sidebar')).getByRole('button', { name: '로그아웃' }),
    ).toHaveClass(
      'border-border',
      'bg-surface',
      'text-text-primary',
      'focus-visible:outline-focus-ring',
    )
    expect(
      within(screen.getByTestId('desktop-sidebar')).getByRole('button', { name: '로그아웃' }),
    ).toHaveAttribute('aria-label', '로그아웃')
  })

  it('shows the actual current-user name in the desktop and mobile header instead of a static name', async () => {
    vi.stubGlobal('fetch', authenticatedFetchMock('인증 사용자'))
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('인증 사용자')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '사이드바 열기' }))
    expect(screen.getByRole('banner')).toHaveTextContent('인증 사용자')
    const mobileSidebar = within(screen.getByRole('dialog', { name: '주요 탐색' }))
    const navigation = mobileSidebar.getByRole('navigation', { name: '주요 탐색' })
    const logoutButton = mobileSidebar.getByRole('button', { name: '로그아웃' })
    expect(logoutButton).toBeInTheDocument()
    expect(logoutButton).toHaveAttribute('aria-label', '로그아웃')
    expect(
      navigation.compareDocumentPosition(logoutButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('describes current-user loading, retries ordinary errors, and delegates a 401 to session expiry', async () => {
    let rejectCurrentUser: ((reason?: unknown) => void) | undefined
    const fetchMock = vi.fn((path: string) => {
      if (path === '/api/me/header') {
        return new Promise<Response>((_resolve, reject) => {
          rejectCurrentUser = reject
        })
      }
      return Promise.resolve(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('사용자 이름을 불러오는 중입니다.')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([path]) => path === '/api/me/header')).toHaveLength(1)
    })
    rejectCurrentUser?.(new Error('temporary failure'))
    expect(await screen.findByRole('alert')).toHaveTextContent('사용자 이름을 불러올 수 없습니다.')
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/me/header')).toHaveLength(2)
  })

  it('returns to login and clears the header when current-user lookup receives 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        Promise.resolve(
          path === '/api/me/header'
            ? new Response(null, { status: 401 })
            : new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
                status: 200,
              }),
        ),
      ),
    )
    render(<App />)

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('uses static Tailwind theme and responsive utilities for the global layout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      ),
    )
    render(<App />)

    expect(await screen.findByRole('banner')).toHaveClass('bg-surface', 'border-border')
    expect(screen.getByRole('button', { name: '사이드바 열기' })).toHaveClass('md:hidden')
    expect(screen.getByRole('main', { name: '콘텐츠' })).toHaveClass('bg-background', 'md:p-8')
    expect(screen.getByRole('banner').className).not.toContain('app-header')
    expect(screen.getByRole('heading', { name: '회의실 예약 현황' })).toBeInTheDocument()
  })

  it('places the meeting-room screen inside the global application shell', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
          status: 200,
        }),
      ),
    )
    const gateway: MeetingRoomGateway = {
      findAvailability: vi.fn().mockResolvedValue({ rooms: [] }),
    }
    window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = gateway

    render(<App />)

    expect(await screen.findByRole('banner')).toHaveTextContent('Flow BI')
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
    expect(openButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows a current calendar navigation link and opens the monthly calendar for an authenticated user', async () => {
    window.history.replaceState({}, '', '/')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })),
    )
    const user = userEvent.setup()

    render(<App />)

    await screen.findByRole('main', { name: '콘텐츠' })
    const calendarLink = screen.getByRole('link', { name: '캘린더' })
    await user.click(calendarLink)

    expect(window.location.search).toBe('?view=month')
    expect(screen.getByRole('link', { name: '캘린더' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('button', { name: '월간 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('opens the existing schedule creation modal from the calendar header and restores trigger focus', async () => {
    window.history.replaceState({}, '', '/')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })),
    )
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('main', { name: '콘텐츠' })
    await user.click(screen.getByRole('link', { name: '캘린더' }))
    const createTrigger = await screen.findByRole('button', { name: '일정 추가' })
    await user.click(createTrigger)
    expect(await screen.findByRole('dialog', { name: '일정 추가' })).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '일정 추가' })).not.toBeInTheDocument()
    expect(createTrigger).toHaveFocus()
  })

  it('closes the mobile sidebar after calendar navigation', async () => {
    window.history.replaceState({}, '', '/')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ authenticated: true, mustChangePassword: false }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })),
    )
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('main', { name: '콘텐츠' })
    await user.click(screen.getByRole('button', { name: '사이드바 열기' }))
    const mobileSidebar = within(screen.getByRole('dialog', { name: '주요 탐색' }))
    await user.click(mobileSidebar.getByRole('link', { name: '캘린더' }))

    expect(screen.queryByRole('dialog', { name: '주요 탐색' })).not.toBeInTheDocument()
    expect(window.location.search).toBe('?view=month')
  })
})
