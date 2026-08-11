import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LoginPage } from './LoginPage'

const normalAccount = {
  employeeNumber: ['TEST', 1001].join('-'),
  password: ['Synthetic', '!', 123].join(''),
}

function renderPage(overrides: Partial<Parameters<typeof LoginPage>[0]> = {}) {
  const onAuthenticated = vi.fn()
  render(<LoginPage onAuthenticated={onAuthenticated} {...overrides} />)
  return { onAuthenticated }
}

describe('LoginPage', () => {
  it('provides labelled, required credentials and keeps the password hidden', () => {
    renderPage()

    expect(screen.getByLabelText('사번')).toBeRequired()
    expect(screen.getByLabelText('비밀번호')).toBeRequired()
    expect(screen.getByLabelText('사번')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('shows validation feedback and moves focus to the first invalid field', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('사번을 입력해 주세요.')
    expect(screen.getByLabelText('사번')).toHaveFocus()
  })

  it('submits with the keyboard and takes the normal authenticated branch', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockResolvedValue({ mustChangePassword: false })
    const { onAuthenticated } = renderPage({ login })

    await user.type(screen.getByLabelText('사번'), normalAccount.employeeNumber)
    await user.type(screen.getByLabelText('비밀번호'), normalAccount.password)
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith({ mustChangePassword: false })
    })
  })

  it('takes the password-change branch when required', async () => {
    const user = userEvent.setup()
    const { onAuthenticated } = renderPage({
      login: vi.fn().mockResolvedValue({ mustChangePassword: true }),
    })

    await user.type(screen.getByLabelText('사번'), normalAccount.employeeNumber)
    await user.type(screen.getByLabelText('비밀번호'), normalAccount.password)
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith({ mustChangePassword: true })
    })
  })

  it.each([
    [401, '사번 또는 비밀번호가 올바르지 않습니다.'],
    [429, '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.'],
    [503, '인증 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'],
  ])('presents the mapped %i failure without authenticating', async (status, message) => {
    const user = userEvent.setup()
    const onAuthenticated = vi.fn()
    render(
      <LoginPage
        login={vi.fn().mockRejectedValue(new Response(null, { status }))}
        onAuthenticated={onAuthenticated}
      />,
    )

    await user.type(screen.getByLabelText('사번'), normalAccount.employeeNumber)
    await user.type(screen.getByLabelText('비밀번호'), normalAccount.password)
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('prevents a duplicate submission while login is pending', async () => {
    const user = userEvent.setup()
    let resolveLogin: ((value: { mustChangePassword: boolean }) => void) | undefined
    const login = vi.fn(
      () =>
        new Promise<{ mustChangePassword: boolean }>((resolve) => {
          resolveLogin = resolve
        }),
    )
    renderPage({ login })

    await user.type(screen.getByLabelText('사번'), normalAccount.employeeNumber)
    await user.type(screen.getByLabelText('비밀번호'), normalAccount.password)
    await user.dblClick(screen.getByRole('button', { name: '로그인' }))

    expect(login).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '로그인 중' })).toBeDisabled()

    resolveLogin?.({ mustChangePassword: false })
  })
})
