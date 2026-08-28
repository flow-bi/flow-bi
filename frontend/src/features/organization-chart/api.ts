import { authenticatedFetch } from '../authenticatedFetch'

export type AccountStatus = 'ACTIVE' | 'INACTIVE'
export type WorkStatus = 'WORKING' | 'IN_MEETING' | 'OUT_OF_OFFICE' | 'ON_LEAVE' | 'OFFLINE'

export type TeamTreeNode = {
  teamId: number
  teamName: string
  depth: number
  children: TeamTreeNode[]
}

export type OrganizationEmployee = {
  userId: number
  name: string
  position: string
  accountStatus: AccountStatus
  workStatus: WorkStatus
  profileImageUrl: string | null
}

export type OrganizationEmployeeProfile = Omit<OrganizationEmployee, 'userId'> & {
  team: string
  extensionNumber: string | null
  email: string
}

export class OrganizationChartApiError extends Error {
  readonly status: number

  constructor(status: number, message = 'Organization chart request failed') {
    super(message)
    this.status = status
  }
}

const accountStatuses = new Set<AccountStatus>(['ACTIVE', 'INACTIVE'])
const workStatuses = new Set<WorkStatus>([
  'WORKING',
  'IN_MEETING',
  'OUT_OF_OFFICE',
  'ON_LEAVE',
  'OFFLINE',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isEmployee(value: unknown): value is OrganizationEmployee {
  return (
    isRecord(value) &&
    typeof value.userId === 'number' &&
    typeof value.name === 'string' &&
    typeof value.position === 'string' &&
    typeof value.accountStatus === 'string' &&
    accountStatuses.has(value.accountStatus as AccountStatus) &&
    typeof value.workStatus === 'string' &&
    workStatuses.has(value.workStatus as WorkStatus) &&
    (typeof value.profileImageUrl === 'string' || value.profileImageUrl === null)
  )
}

function isTeamTreeNode(value: unknown): value is TeamTreeNode {
  return (
    isRecord(value) &&
    typeof value.teamId === 'number' &&
    typeof value.teamName === 'string' &&
    typeof value.depth === 'number' &&
    Array.isArray(value.children) &&
    value.children.every(isTeamTreeNode)
  )
}

function isEmployeeProfile(value: unknown): value is OrganizationEmployeeProfile {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.position === 'string' &&
    typeof value.team === 'string' &&
    (typeof value.extensionNumber === 'string' || value.extensionNumber === null) &&
    typeof value.email === 'string' &&
    typeof value.accountStatus === 'string' &&
    accountStatuses.has(value.accountStatus as AccountStatus) &&
    typeof value.workStatus === 'string' &&
    workStatuses.has(value.workStatus as WorkStatus) &&
    (typeof value.profileImageUrl === 'string' || value.profileImageUrl === null)
  )
}

async function getJson(path: string): Promise<unknown> {
  const response = await authenticatedFetch(path)
  if (!response.ok) {
    throw new OrganizationChartApiError(response.status)
  }
  return response.json()
}

export async function getTeamTree(): Promise<TeamTreeNode[]> {
  const data = await getJson('/api/teams/tree')
  if (!Array.isArray(data) || !data.every(isTeamTreeNode)) {
    throw new OrganizationChartApiError(200, 'Organization team tree response is invalid')
  }
  return data
}

export async function getTeamEmployees(teamId: number): Promise<OrganizationEmployee[]> {
  const data = await getJson(`/api/users?teamId=${teamId}`)
  if (!Array.isArray(data) || !data.every(isEmployee)) {
    throw new OrganizationChartApiError(200, 'Organization employee list response is invalid')
  }
  return data
}

export async function getEmployeeProfile(userId: number): Promise<OrganizationEmployeeProfile> {
  const data = await getJson(`/api/users/${userId}`)
  if (!isEmployeeProfile(data)) {
    throw new OrganizationChartApiError(200, 'Organization employee profile response is invalid')
  }
  return data
}
