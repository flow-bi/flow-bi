import type { AdminUser } from '../types/admin'

export function getFilteredAdminUsers(users: AdminUser[], search: string) {
  return users.filter(
    (user) =>
      user.name.includes(search) || user.empNo.includes(search) || user.loginId.includes(search),
  )
}
