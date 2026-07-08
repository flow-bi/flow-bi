import { getStatusLabel, getUserInitials } from '../lib/organizationUtils'

import type { OrganizationUser } from '../types/organization'

type EmployeeListProps = {
  selectedUserId: string | null
  users: OrganizationUser[]
  onUserSelect: (user: OrganizationUser) => void
}

export function EmployeeList({ onUserSelect, selectedUserId, users }: EmployeeListProps) {
  return (
    <section className="panel employee-list-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Employees</p>
          <h2>직원 목록</h2>
        </div>
        <span className="success-badge">{users.length}명</span>
      </div>

      <div className="employee-list">
        {users.map((user) => (
          <button
            className={selectedUserId === user.userId ? 'employee-card selected' : 'employee-card'}
            key={user.userId}
            type="button"
            onClick={() => {
              onUserSelect(user)
            }}
          >
            <span className="avatar small">{getUserInitials(user.name)}</span>
            <span className="employee-card-main">
              <span>
                <strong>{user.name}</strong>
                <small>{user.employeeNumber}</small>
              </span>
              <span>
                <strong>{user.team}</strong>
                <small>{user.position}</small>
              </span>
            </span>
            <span className="employee-card-contact">
              <strong>{user.email}</strong>
              <small>{user.phoneNumber}</small>
            </span>
            <span className={`status-badge ${user.status.toLowerCase()}`}>
              {getStatusLabel(user.status)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
