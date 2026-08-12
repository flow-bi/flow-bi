import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the company and signed-in user in the header without a search input', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Flow BI')
    expect(screen.getByRole('banner')).toHaveTextContent('김유선')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('provides labelled navigation and main landmarks with headings', () => {
    render(<App />)

    expect(screen.getByRole('navigation', { name: '주요 탐색' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: '콘텐츠' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '콘텐츠' })).toBeInTheDocument()
  })

  it('uses static Tailwind theme and responsive utilities for the global layout', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveClass('bg-surface', 'border-border')
    expect(screen.getByRole('button', { name: '사이드바 열기' })).toHaveClass('md:hidden')
    expect(screen.getByRole('main', { name: '콘텐츠' })).toHaveClass('bg-background', 'md:p-8')
    expect(screen.getByRole('banner').className).not.toContain('app-header')
  })

  it('opens and closes the mobile sidebar with Escape and restores focus to its trigger', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()

    const openButton = screen.getByRole('button', { name: '사이드바 열기' })
    expect(openButton).toHaveFocus()
    expect(openButton).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('dialog', { name: '주요 탐색' })).toBeInTheDocument()
    expect(openButton).toHaveAttribute('aria-expanded', 'true')

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

    await screen.findByText('로그인되었습니다.')
    const calendarLink = screen.getByRole('link', { name: '캘린더' })
    await user.click(calendarLink)

    expect(window.location.search).toBe('?view=month')
    expect(screen.getByRole('link', { name: '캘린더' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('button', { name: '월간 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
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

    await screen.findByText('로그인되었습니다.')
    await user.click(screen.getByRole('button', { name: '사이드바 열기' }))
    const mobileSidebar = within(screen.getByRole('dialog', { name: '주요 탐색' }))
    await user.click(mobileSidebar.getByRole('link', { name: '캘린더' }))

    expect(screen.queryByRole('dialog', { name: '주요 탐색' })).not.toBeInTheDocument()
    expect(window.location.search).toBe('?view=month')
  })
})
