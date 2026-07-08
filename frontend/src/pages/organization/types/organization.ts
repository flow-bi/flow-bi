export type OrganizationUserStatus = 'ACTIVE' | 'REMOTE' | 'LEAVE'

export type OrganizationTeam = {
  teamId: string
  teamName: string
  parentTeamId: string | null
  members: string[]
}

export type OrganizationUser = {
  userId: string
  employeeNumber: string
  name: string
  email: string
  phoneNumber: string
  status: OrganizationUserStatus
  profileImageUrl: string
  team: string
  teamId: string
  position: string
  roles: string[]
}
