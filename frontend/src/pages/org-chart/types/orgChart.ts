export type OrgStatus = 'ACTIVE' | 'INACTIVE'

export interface OrgNode {
  id: number
  name: string
  code: string
  status: OrgStatus
  children: OrgNode[]
}

export interface OrgMember {
  id: number
  name: string
  grade: string
  position: string
  type: string
}

export type OrgMembersByOrg = Record<number, OrgMember[]>
