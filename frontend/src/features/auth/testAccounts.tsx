import { useRef, useState } from 'react'

import { EmployeeAccountModal } from './EmployeeAccountModal'

type TestAccount = {
  employeeNumber: string
  password: string
}

type TestAccounts = {
  display: boolean
  normal: TestAccount
  passwordChange: TestAccount
}

declare global {
  interface Window {
    __FLOW_BI_TEST_ACCOUNTS__?: TestAccounts
  }
}

function testAccountsFromRuntime(): TestAccounts | undefined {
  const accounts = window.__FLOW_BI_TEST_ACCOUNTS__
  if (
    accounts?.display !== true ||
    accounts.normal.employeeNumber.length === 0 ||
    accounts.normal.password.length === 0 ||
    accounts.passwordChange.employeeNumber.length === 0 ||
    accounts.passwordChange.password.length === 0
  ) {
    return undefined
  }

  return accounts
}

type TestAccountNoticeProps = { onEmployeeAccountCreated?: (employeeNumber: string) => void }

export function TestAccountNotice({ onEmployeeAccountCreated }: TestAccountNoticeProps) {
  const accounts = testAccountsFromRuntime()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function closeModal() {
    setIsModalOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  return (
    <>
      {accounts === undefined ? null : (
        <aside aria-label="개발 테스트 계정" className="test-account-notice">
          <h2>개발 테스트 계정</h2>
          <p>로컬 및 E2E 검증 환경에서만 제공되는 합성 계정입니다.</p>
          <dl>
            <div>
              <dt>일반 로그인</dt>
              <dd>사번: {accounts.normal.employeeNumber}</dd>
              <dd>비밀번호: {accounts.normal.password}</dd>
            </div>
            <div>
              <dt>최초 로그인</dt>
              <dd>사번: {accounts.passwordChange.employeeNumber}</dd>
              <dd>비밀번호: {accounts.passwordChange.password}</dd>
            </div>
          </dl>
        </aside>
      )}
      <button ref={triggerRef} type="button" onClick={() => setIsModalOpen(true)}>
        직원 계정 생성
      </button>
      {isModalOpen && (
        <EmployeeAccountModal
          onClose={closeModal}
          onCreated={(employeeNumber) => {
            setIsModalOpen(false)
            onEmployeeAccountCreated?.(employeeNumber)
          }}
        />
      )}
    </>
  )
}
