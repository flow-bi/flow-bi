import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EmployeeAccountModal } from './EmployeeAccountModal'

const options = {
  teams: [{ id: 1, name: 'Platform' }],
  positions: [{ id: 2, name: 'Engineer' }],
}

function renderModal(overrides: Partial<Parameters<typeof EmployeeAccountModal>[0]> = {}) {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(
    <EmployeeAccountModal
      createAccount={vi.fn()}
      loadOptions={vi.fn().mockResolvedValue(options)}
      onClose={onClose}
      onCreated={onCreated}
      {...overrides}
    />,
  )
  return { onClose, onCreated }
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('사번'), 'DEV-2001')
  await user.type(screen.getByLabelText('이름'), '개발 사용자')
  await user.selectOptions(screen.getByLabelText('팀'), '1')
  await user.selectOptions(screen.getByLabelText('직급'), '2')
  await user.type(screen.getByLabelText('초기 비밀번호'), 'Initial!1234')
  await user.type(screen.getByLabelText('비밀번호 확인'), 'Initial!1234')
}

describe('EmployeeAccountModal', () => {
  it('loads persisted teams and positions and creates an account with required fields only', async () => {
    const user = userEvent.setup()
    const createAccount = vi.fn().mockResolvedValue({ employeeNumber: 'DEV-2001', mustChangePassword: true })
    const { onCreated } = renderModal({ createAccount })

    await screen.findByRole('option', { name: 'Platform' })
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: '직원 계정 생성' }))

    await waitFor(() => {
      expect(createAccount).toHaveBeenCalledWith({
        employeeNumber: 'DEV-2001',
        name: '개발 사용자',
        teamId: 1,
        positionId: 2,
        initialPassword: 'Initial!1234',
        confirmation: 'Initial!1234',
      })
      expect(onCreated).toHaveBeenCalledWith('DEV-2001')
    })
  })

  it('shows linked validation feedback, prevents duplicate submission, and does not expose a password-change choice', async () => {
    const user = userEvent.setup()
    let resolveRequest: (() => void) | undefined
    const createAccount = vi.fn(
      () => new Promise<{ employeeNumber: string; mustChangePassword: true }>((resolve) => { resolveRequest = () => resolve({ employeeNumber: 'DEV-2001', mustChangePassword: true }) }),
    )
    renderModal({ createAccount })

    await screen.findByRole('option', { name: 'Platform' })
    await user.click(screen.getByRole('button', { name: '직원 계정 생성' }))
    expect(await screen.findByText('사번을 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('사번')).toHaveAttribute('aria-describedby')
    expect(screen.queryByLabelText(/비밀번호 변경/)).not.toBeInTheDocument()

    await fillValidForm(user)
    await user.dblClick(screen.getByRole('button', { name: '직원 계정 생성' }))
    expect(createAccount).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '생성 중' })).toBeDisabled()
    resolveRequest?.()
  })

  it('provides a retry action for options failure and status-specific creation errors', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn().mockRejectedValueOnce(new Response(null, { status: 503 })).mockResolvedValue(options)
    const createAccount = vi.fn().mockRejectedValue(new Response(null, { status: 409 }))
    renderModal({ loadOptions, createAccount })

    expect(await screen.findByText('참조 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    await screen.findByRole('option', { name: 'Platform' })
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: '직원 계정 생성' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 사용 중인 사번입니다. 다른 사번을 입력해 주세요.')
  })

  it('keeps focus within the modal, confirms discarding entered data, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { onClose } = renderModal({ returnFocusTo: trigger })

    await screen.findByRole('option', { name: 'Platform' })
    expect(screen.getByLabelText('사번')).toHaveFocus()
    await user.type(screen.getByLabelText('사번'), 'DEV-2001')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('입력한 내용을 버리고 닫을까요?')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
