import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LoginApiError } from './api'
import { PasswordChangePage } from './PasswordChangePage'

const validPassword = 'Changed!1234'

describe('PasswordChangePage', () => {
  it('blocks the normal screen until a valid password change succeeds', async () => {
    const changePassword = vi.fn().mockResolvedValue({ mustChangePassword: false })
    const onCompleted = vi.fn()
    const user = userEvent.setup()
    render(<PasswordChangePage changePassword={changePassword} onCompleted={onCompleted} />)

    await user.type(screen.getByLabelText('새 비밀번호'), validPassword)
    await user.type(screen.getByLabelText('비밀번호 확인'), validPassword)
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('비밀번호가 변경되었습니다.')).toBeInTheDocument()
    expect(onCompleted).toHaveBeenCalledOnce()
    expect(changePassword).toHaveBeenCalledWith({
      newPassword: validPassword,
      confirmation: validPassword,
    })
  })

  it('focuses validation errors and does not submit mismatched or weak passwords', async () => {
    const changePassword = vi.fn()
    const user = userEvent.setup()
    render(<PasswordChangePage changePassword={changePassword} onCompleted={vi.fn()} />)

    await user.type(screen.getByLabelText('새 비밀번호'), 'short')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'different')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '영문, 숫자, 특수문자를 포함해 10자 이상 입력해 주세요.',
    )
    expect(screen.getByLabelText('새 비밀번호')).toHaveFocus()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('prevents duplicate submissions and maps service failures without exposing password values', async () => {
    let resolveChange: ((value: { mustChangePassword: false }) => void) | undefined
    const changePassword = vi.fn(
      () =>
        new Promise<{ mustChangePassword: false }>((resolve) => {
          resolveChange = resolve
        }),
    )
    const user = userEvent.setup()
    render(<PasswordChangePage changePassword={changePassword} onCompleted={vi.fn()} />)

    await user.type(screen.getByLabelText('새 비밀번호'), validPassword)
    await user.type(screen.getByLabelText('비밀번호 확인'), validPassword)
    await user.dblClick(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(changePassword).toHaveBeenCalledTimes(1)
    resolveChange?.({ mustChangePassword: false })
  })

  it('clears password values and redirects when the server reports an expired session', async () => {
    const onSessionExpired = vi.fn()
    const user = userEvent.setup()
    render(
      <PasswordChangePage
        changePassword={vi.fn().mockRejectedValue(new LoginApiError(401))}
        onCompleted={vi.fn()}
        onSessionExpired={onSessionExpired}
      />,
    )

    await user.type(screen.getByLabelText('새 비밀번호'), validPassword)
    await user.type(screen.getByLabelText('비밀번호 확인'), validPassword)
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(onSessionExpired).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('새 비밀번호')).toHaveValue('')
  })
})
