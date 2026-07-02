export type AdminTab = 'users' | 'rooms' | 'grades'

export type AdminStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface AdminUser {
  id: number
  name: string
  loginId: string
  empNo: string
  email: string
  grade: string
  position: string
  dept: string
  status: AdminStatus
}

export interface AdminRoom {
  id: number
  name: string
  location: string
  capacity: number
  status: string
  desc: string
}

export interface AdminRankItem {
  id: number
  name: string
  order: number
  status: AdminStatus
}
