import type {
  OrganizationTeam,
  OrganizationUser,
  OrganizationUserStatus,
} from '../types/organization'

export function getUserInitials(name: string) {
  return name.slice(0, 2)
}

export function getStatusLabel(status: OrganizationUserStatus) {
  if (status === 'ACTIVE') {
    return '근무 중'
  }

  if (status === 'REMOTE') {
    return '원격'
  }

  return '부재'
}

export function getChildTeamIds(teams: OrganizationTeam[], teamId: string): string[] {
  const children = teams.filter((team) => team.parentTeamId === teamId)

  return children.flatMap((team) => [team.teamId, ...getChildTeamIds(teams, team.teamId)])
}

export function getTeamFilterIds(teams: OrganizationTeam[], selectedTeamId: string) {
  if (selectedTeamId === 'ALL') {
    return []
  }

  return [selectedTeamId, ...getChildTeamIds(teams, selectedTeamId)]
}

export function getTeamMemberCount(
  users: OrganizationUser[],
  teams: OrganizationTeam[],
  teamId: string,
) {
  if (teamId === 'ALL') {
    return users.length
  }

  const teamIds = getTeamFilterIds(teams, teamId)

  return users.filter((user) => teamIds.includes(user.teamId)).length
}

export function filterOrganizationUsers({
  query,
  selectedStatus,
  selectedTeamId,
  teams,
  users,
}: {
  query: string
  selectedStatus: 'ALL' | OrganizationUserStatus
  selectedTeamId: string
  teams: OrganizationTeam[]
  users: OrganizationUser[]
}) {
  const normalizedQuery = query.trim().toLowerCase()
  const teamIds = getTeamFilterIds(teams, selectedTeamId)

  return users.filter((user) => {
    const matchesTeam = selectedTeamId === 'ALL' || teamIds.includes(user.teamId)
    const matchesStatus = selectedStatus === 'ALL' || user.status === selectedStatus
    const searchableText = [
      user.employeeNumber,
      user.name,
      user.email,
      user.phoneNumber,
      user.team,
      user.position,
    ]
      .join(' ')
      .toLowerCase()
    const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery)

    return matchesTeam && matchesStatus && matchesQuery
  })
}
