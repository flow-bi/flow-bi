import { useRef, useState } from 'react'

import { EmployeeAccountModal } from './EmployeeAccountModal'

type DevEmployeeAccountEntryProps = {
  onEmployeeAccountCreated: (employeeNumber: string) => void
}

export function DevEmployeeAccountEntry({
  onEmployeeAccountCreated,
}: DevEmployeeAccountEntryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function closeModal() {
    setIsModalOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setIsModalOpen(true)}>
        직원 계정 생성
      </button>
      {isModalOpen && (
        <EmployeeAccountModal
          onClose={closeModal}
          onCreated={(employeeNumber) => {
            setIsModalOpen(false)
            onEmployeeAccountCreated(employeeNumber)
            window.setTimeout(() => triggerRef.current?.focus(), 0)
          }}
        />
      )}
    </>
  )
}
