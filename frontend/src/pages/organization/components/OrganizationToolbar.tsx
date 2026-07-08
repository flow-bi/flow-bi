import type { OrganizationUserStatus } from '../types/organization'

type OrganizationToolbarProps = {
  query: string
  selectedStatus: 'ALL' | OrganizationUserStatus
  onQueryChange: (query: string) => void
  onStatusChange: (status: 'ALL' | OrganizationUserStatus) => void
}

const statusOptions: Array<{ label: string; value: 'ALL' | OrganizationUserStatus }> = [
  { label: '전체 상태', value: 'ALL' },
  { label: '근무 중', value: 'ACTIVE' },
  { label: '원격', value: 'REMOTE' },
  { label: '부재', value: 'LEAVE' },
]

export function OrganizationToolbar({
  onQueryChange,
  onStatusChange,
  query,
  selectedStatus,
}: OrganizationToolbarProps) {
  return (
    <article className="panel organization-toolbar-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Organization</p>
          <h2>조직도</h2>
        </div>
      </div>

      <div className="filter-row organization-filter-row">
        <label className="field organization-search-field">
          <span>직원 검색</span>
          <input
            placeholder="이름, 사번, 이메일, 직책 검색"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value)
            }}
          />
        </label>
        <label className="field compact">
          <span>상태</span>
          <select
            value={selectedStatus}
            onChange={(event) => {
              onStatusChange(event.target.value as 'ALL' | OrganizationUserStatus)
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  )
}
