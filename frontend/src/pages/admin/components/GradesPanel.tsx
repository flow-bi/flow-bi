import { RankTable } from './RankTable'

import type { AdminRankItem } from '../types/admin'

interface GradesPanelProps {
  jobGrades: AdminRankItem[]
  positions: AdminRankItem[]
}

export function GradesPanel({ jobGrades, positions }: GradesPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <RankTable title="직급 관리" nameHeader="직급명" items={jobGrades} />
      <RankTable title="직책 관리" nameHeader="직책명" items={positions} />
    </div>
  )
}
