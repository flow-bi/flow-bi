import { getStatusLabel, getUserInitials } from '../lib/organizationUtils'

import type { OrganizationUser } from '../types/organization'

type EmployeeDetailPanelProps = {
  user: OrganizationUser | null
  onClose: () => void
}

export function EmployeeDetailPanel({ onClose, user }: EmployeeDetailPanelProps) {
  if (!user) {
    return (
      <aside className="panel employee-detail-panel">
        <div className="empty-state">직원을 선택하면 상세 정보가 표시됩니다.</div>
      </aside>
    )
  }

  return (
    <aside className="panel employee-detail-panel">
      <div className="panel-header">
        <div className="employee-profile-heading">
          <span className="avatar large">{getUserInitials(user.name)}</span>
          <div>
            <p className="section-label">Profile</p>
            <h2>{user.name}</h2>
            <span className={`status-badge ${user.status.toLowerCase()}`}>
              {getStatusLabel(user.status)}
            </span>
          </div>
        </div>
        <button className="secondary-button" type="button" onClick={onClose}>
          닫기
        </button>
      </div>

      <div className="detail-list">
        <div>
          <span>사번</span>
          <strong>{user.employeeNumber}</strong>
        </div>
        <div>
          <span>소속</span>
          <strong>{user.team}</strong>
        </div>
        <div>
          <span>직책/직무</span>
          <strong>{user.position}</strong>
        </div>
        <div>
          <span>이메일</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span>연락처</span>
          <strong>{user.phoneNumber}</strong>
        </div>
        <div>
          <span>권한</span>
          <strong>{user.roles.join(', ')}</strong>
        </div>
      </div>
    </aside>
  )
}
