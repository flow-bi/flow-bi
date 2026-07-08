import { useMemo, useState } from 'react'

import { EmployeeDetailPanel } from './components/EmployeeDetailPanel'
import { EmployeeList } from './components/EmployeeList'
import { OrganizationToolbar } from './components/OrganizationToolbar'
import { OrganizationTree } from './components/OrganizationTree'
import { filterOrganizationUsers } from './lib/organizationUtils'
import { organizationTeamsMock, organizationUsersMock } from './mock/organizationMock'

import type { OrganizationUser, OrganizationUserStatus } from './types/organization'

function OrganizationPage() {
  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | OrganizationUserStatus>('ALL')
  const [selectedTeamId, setSelectedTeamId] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null)

  const filteredUsers = useMemo(
    () =>
      filterOrganizationUsers({
        query,
        selectedStatus,
        selectedTeamId,
        teams: organizationTeamsMock,
        users: organizationUsersMock,
      }),
    [query, selectedStatus, selectedTeamId],
  )

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    setSelectedUser(null)
  }

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setSelectedUser(null)
  }

  const handleStatusChange = (nextStatus: 'ALL' | OrganizationUserStatus) => {
    setSelectedStatus(nextStatus)
    setSelectedUser(null)
  }

  return (
    <section className="page-stack organization-page">
      <OrganizationToolbar
        query={query}
        selectedStatus={selectedStatus}
        onQueryChange={handleQueryChange}
        onStatusChange={handleStatusChange}
      />

      <div className="organization-workspace">
        <OrganizationTree
          selectedTeamId={selectedTeamId}
          teams={organizationTeamsMock}
          users={organizationUsersMock}
          onTeamSelect={handleTeamSelect}
        />
        <EmployeeList
          selectedUserId={selectedUser?.userId ?? null}
          users={filteredUsers}
          onUserSelect={setSelectedUser}
        />
        <EmployeeDetailPanel
          user={selectedUser}
          onClose={() => {
            setSelectedUser(null)
          }}
        />
      </div>
    </section>
  )
}

export default OrganizationPage
