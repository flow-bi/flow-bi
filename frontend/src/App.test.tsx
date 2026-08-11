import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the company and signed-in user in the header without a search input', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Flow BI')
    expect(screen.getByRole('banner')).toHaveTextContent('윤서')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('provides labelled navigation and main landmarks with headings', () => {
    render(<App />)

    expect(screen.getByRole('navigation', { name: '주요 탐색' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: '콘텐츠' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '콘텐츠' })).toBeInTheDocument()
  })

  it('opens and closes the mobile sidebar with Escape and restores focus to its trigger', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()

    const openButton = screen.getByRole('button', { name: '사이드바 열기' })
    expect(openButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('dialog', { name: '주요 탐색' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '주요 탐색' })).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })
})
