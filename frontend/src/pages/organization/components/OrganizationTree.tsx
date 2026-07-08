import { useMemo, useState } from 'react'

import { getTeamMemberCount } from '../lib/organizationUtils'

import type { OrganizationTeam, OrganizationUser } from '../types/organization'

type OrganizationTreeProps = {
  selectedTeamId: string
  teams: OrganizationTeam[]
  users: OrganizationUser[]
  onTeamSelect: (teamId: string) => void
}

export function OrganizationTree({
  onTeamSelect,
  selectedTeamId,
  teams,
  users,
}: OrganizationTreeProps) {
  const [expandedTeamIds, setExpandedTeamIds] = useState<string[]>([
    'company',
    'division-product',
    'division-business',
  ])
  const childTeamsByParentId = useMemo(
    () =>
      teams.reduce<Record<string, OrganizationTeam[]>>((groups, team) => {
        const parentId = team.parentTeamId ?? 'ROOT'

        return {
          ...groups,
          [parentId]: [...(groups[parentId] ?? []), team],
        }
      }, {}),
    [teams],
  )

  const toggleTeam = (teamId: string) => {
    setExpandedTeamIds((currentIds) =>
      currentIds.includes(teamId)
        ? currentIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentIds, teamId],
    )
  }

  const renderTeamNodes = (parentId: string) => {
    const children = childTeamsByParentId[parentId] ?? []

    return children.map((team) => {
      const nestedTeams = childTeamsByParentId[team.teamId] ?? []
      const hasChildren = nestedTeams.length > 0
      const isExpanded = expandedTeamIds.includes(team.teamId)
      const count = getTeamMemberCount(users, teams, team.teamId)

      return (
        <div className="organization-team-branch" key={team.teamId}>
          <div
            className={
              selectedTeamId === team.teamId
                ? 'organization-team-node active'
                : 'organization-team-node'
            }
          >
            {hasChildren ? (
              <button
                className="team-toggle-button"
                type="button"
                aria-expanded={isExpanded}
                aria-label={`${team.teamName} ${isExpanded ? '접기' : '펼치기'}`}
                onClick={() => {
                  toggleTeam(team.teamId)
                }}
              >
                {isExpanded ? '▾' : '▸'}
              </button>
            ) : (
              <span className="team-toggle-placeholder" />
            )}
            <button
              className="organization-team-select"
              type="button"
              onClick={() => {
                onTeamSelect(team.teamId)
              }}
            >
              {team.teamName}
            </button>
            <strong>{count}</strong>
          </div>
          {hasChildren && isExpanded ? (
            <div className="organization-team-children">{renderTeamNodes(team.teamId)}</div>
          ) : null}
        </div>
      )
    })
  }

  return (
    <aside className="panel organization-tree-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Teams</p>
          <h2>부서/팀</h2>
        </div>
      </div>

      <div className="organization-team-list">
        <div
          className={
            selectedTeamId === 'ALL' ? 'organization-team-node active' : 'organization-team-node'
          }
        >
          <span className="team-toggle-placeholder" />
          <button
            className="organization-team-select"
            type="button"
            onClick={() => {
              onTeamSelect('ALL')
            }}
          >
            전체
          </button>
          <strong>{users.length}</strong>
        </div>
        {renderTeamNodes('ROOT')}
      </div>
    </aside>
  )
}
