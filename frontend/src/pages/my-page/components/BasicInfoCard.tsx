import { Hash, Mail, Phone, User } from 'lucide-react'

import { ProfileInfoItem } from './ProfileInfoItem'

import type { MyPageUser } from '../types/myPage'

interface BasicInfoCardProps {
  user: MyPageUser
}

export function BasicInfoCard({ user }: BasicInfoCardProps) {
  const infoItems = [
    { icon: Hash, label: '사번', value: user.employeeNo },
    { icon: Mail, label: '이메일', value: user.email },
    { icon: Phone, label: '전화번호', value: user.phone },
    { icon: User, label: '로그인 ID', value: user.loginId },
  ]

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-foreground mb-4">기본 정보</h3>
      <div className="space-y-3.5">
        {infoItems.map((item) => (
          <ProfileInfoItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>
    </div>
  )
}
