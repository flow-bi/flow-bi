import { render, screen } from '@testing-library/react'
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
  it('does not render when the explicit flag or either credential is missing', () => {
    window.__FLOW_BI_TEST_ACCOUNTS__ = {
      display: false,
      normal: normalAccount,
      passwordChange: passwordChangeAccount,
    }
    const { rerender } = render(<TestAccountNotice />)

    expect(screen.queryByLabelText('개발 테스트 계정')).not.toBeInTheDocument()

    window.__FLOW_BI_TEST_ACCOUNTS__ = {
      display: true,
      normal: { ...normalAccount, employeeNumber: '' },
      passwordChange: passwordChangeAccount,
    }
    rerender(<TestAccountNotice />)

    expect(screen.queryByLabelText('개발 테스트 계정')).not.toBeInTheDocument()
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
