import { useState } from 'react'

import { MEETING_ROOMS } from '@/mocks/rooms'

import { AdminTabs } from './components/AdminTabs'
import { GradesPanel } from './components/GradesPanel'
import { RoomsPanel } from './components/RoomsPanel'
import { UsersPanel } from './components/UsersPanel'
import { ADMIN_TABS } from './constants/admin'
import { getFilteredAdminUsers } from './lib/admin'
import { ALL_USERS, JOB_GRADES, POSITIONS } from './mock/admin'

import type { AdminTab } from './types/admin'

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users')
  const [userSearch, setUserSearch] = useState('')

  const filteredUsers = getFilteredAdminUsers(ALL_USERS, userSearch)

  return (
    <div className="p-6">
      <AdminTabs tabs={ADMIN_TABS} activeTab={tab} onTabChange={setTab} />

      {tab === 'users' && (
        <UsersPanel users={filteredUsers} search={userSearch} onSearchChange={setUserSearch} />
      )}

      {tab === 'rooms' && <RoomsPanel rooms={MEETING_ROOMS} />}

      {tab === 'grades' && <GradesPanel jobGrades={JOB_GRADES} positions={POSITIONS} />}
    </div>
  )
}
