import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { TestAccountNotice } from './testAccounts'

const normalAccount = {
  employeeNumber: ['TEST', 1001].join('-'),
  password: ['Synthetic', '!', 123].join(''),
}
const passwordChangeAccount = {
  employeeNumber: ['TEST', 1002].join('-'),
  password: ['Synthetic', '!', 456].join(''),
}

afterEach(() => {
  delete window.__FLOW_BI_TEST_ACCOUNTS__
})

describe('TestAccountNotice', () => {
  it('hides credentials but keeps the employee account action when runtime accounts are missing', () => {
    window.__FLOW_BI_TEST_ACCOUNTS__ = {
      display: false,
      normal: normalAccount,
      passwordChange: passwordChangeAccount,
    }
    const { rerender } = render(<TestAccountNotice />)

    expect(screen.queryByLabelText('개발 테스트 계정')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '직원 계정 생성' })).toBeInTheDocument()

    window.__FLOW_BI_TEST_ACCOUNTS__ = {
      display: true,
      normal: { ...normalAccount, employeeNumber: '' },
      passwordChange: passwordChangeAccount,
    }
    rerender(<TestAccountNotice />)

    expect(screen.queryByLabelText('개발 테스트 계정')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '직원 계정 생성' })).toBeInTheDocument()
  })

  it('opens the employee account modal without runtime-injected test accounts', async () => {
    const user = userEvent.setup()
    render(<TestAccountNotice />)

    await user.click(screen.getByRole('button', { name: '직원 계정 생성' }))

    expect(screen.getByRole('dialog', { name: '직원 계정 생성' })).toBeInTheDocument()
  })

  it('renders only explicitly enabled runtime-injected synthetic credentials', async () => {
    window.__FLOW_BI_TEST_ACCOUNTS__ = {
      display: true,
      normal: normalAccount,
      passwordChange: passwordChangeAccount,
    }
    render(<TestAccountNotice />)

    expect(await screen.findByLabelText('개발 테스트 계정')).toHaveTextContent(
      normalAccount.employeeNumber,
    )
    expect(screen.getByLabelText('개발 테스트 계정')).toHaveTextContent(
      passwordChangeAccount.employeeNumber,
    )
  })
})
