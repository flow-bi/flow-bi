import { CURRENT_USER } from '@/mocks/current-user'

import { MyPageInfoGrid } from './components/MyPageInfoGrid'
import { MyPageProfileCard } from './components/MyPageProfileCard'

export function MyPage() {
  return (
    <div className="p-6 max-w-2xl">
      <MyPageProfileCard user={CURRENT_USER} />
      <MyPageInfoGrid user={CURRENT_USER} />
    </div>
  )
}
