import { getMemberStatusLabel } from '../lib/formatDashboard'

import type { TeamMemberStatus } from '../types/dashboard'

type TeamStatusPanelProps = {
  members: TeamMemberStatus[]
}

export function TeamStatusPanel({ members }: TeamStatusPanelProps) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Team</p>
          <h2>팀원 상태</h2>
        </div>
      </div>
      {members.length > 0 ? (
        <div className="member-list">
          {members.map((member) => (
            <article className="user-card" key={member.userId}>
              <div className="avatar small" aria-hidden="true">
                {member.name.slice(0, 1)}
              </div>
              <div>
                <strong>{member.name}</strong>
                <p>{member.position}</p>
              </div>
              <span className={`status-badge ${member.status.toLowerCase()}`}>
                {getMemberStatusLabel(member.status)}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">표시할 팀원 상태가 없습니다.</div>
      )}
    </article>
  )
}
