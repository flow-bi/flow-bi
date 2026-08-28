import { useQuery } from '@tanstack/react-query'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'

import {
  getEmployeeProfile,
  getTeamEmployees,
  getTeamTree,
  OrganizationChartApiError,
  type AccountStatus,
  type OrganizationEmployee,
  type OrganizationEmployeeProfile,
  type TeamTreeNode,
  type WorkStatus,
} from './api'

const TEAM_TREE_QUERY_KEY = ['organization-chart', 'team-tree'] as const
const teamEmployeesQueryKey = (teamId: number) =>
  ['organization-chart', 'team', teamId, 'employees'] as const
const employeeProfileQueryKey = (userId: number) =>
  ['organization-chart', 'employee', userId] as const

const accountStatusLabel: Record<AccountStatus, string> = { ACTIVE: '활성', INACTIVE: '비활성' }
const workStatusLabel: Record<WorkStatus, string> = {
  WORKING: '업무 중',
  IN_MEETING: '회의 중',
  OUT_OF_OFFICE: '외근 중',
  ON_LEAVE: '휴가 중',
  OFFLINE: '오프라인',
}

type SelectedTeam = Pick<TeamTreeNode, 'teamId' | 'teamName'>

function isUnauthenticated(error: unknown): boolean {
  return error instanceof OrganizationChartApiError && error.status === 401
}

function Status({
  accountStatus,
  workStatus,
}: Pick<OrganizationEmployee, 'accountStatus' | 'workStatus'>) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="rounded-full border border-border px-2 py-1">
        계정 상태: {accountStatusLabel[accountStatus]}
      </span>
      <span className="rounded-full border border-border px-2 py-1">
        근무 상태: {workStatusLabel[workStatus]}
      </span>
    </div>
  )
}

function TeamTree({
  teams,
  selectedTeamId,
  onSelect,
  treeRef,
}: {
  teams: TeamTreeNode[]
  selectedTeamId?: number
  onSelect: (team: SelectedTeam) => void
  treeRef: RefObject<HTMLDivElement | null>
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const visibleTeams = useMemo(() => {
    const result: TeamTreeNode[] = []
    const visit = (nodes: TeamTreeNode[]) =>
      nodes.forEach((team) => {
        result.push(team)
        if (expanded.has(team.teamId)) {
          visit(team.children)
        }
      })
    visit(teams)
    return result
  }, [expanded, teams])
  const teamRefs = useRef(new Map<number, HTMLDivElement>())

  const select = (team: TeamTreeNode) => onSelect({ teamId: team.teamId, teamName: team.teamName })
  const moveFocus = (teamId: number, offset: number) => {
    const index = visibleTeams.findIndex((team) => team.teamId === teamId)
    const next = visibleTeams[index + offset]
    if (next) {
      teamRefs.current.get(next.teamId)?.focus()
    }
  }

  const renderNodes = (nodes: TeamTreeNode[]) => (
    <ul role="group" className="m-0 list-none space-y-1 p-0">
      {nodes.map((team) => {
        const canExpand = team.children.length > 0
        const isExpanded = expanded.has(team.teamId)
        return (
          <li key={team.teamId}>
            <div
              aria-expanded={canExpand ? isExpanded : undefined}
              aria-level={team.depth + 1}
              aria-selected={selectedTeamId === team.teamId}
              className="cursor-pointer rounded-md border border-transparent px-3 py-2 focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 aria-selected:border-primary aria-selected:bg-secondary"
              onClick={() => select(team)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveFocus(team.teamId, 1)
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveFocus(team.teamId, -1)
                }
                if (event.key === 'ArrowRight' && canExpand) {
                  event.preventDefault()
                  setExpanded((current) => new Set(current).add(team.teamId))
                }
                if (event.key === 'ArrowLeft' && canExpand) {
                  event.preventDefault()
                  setExpanded((current) => {
                    const next = new Set(current)
                    next.delete(team.teamId)
                    return next
                  })
                }
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  select(team)
                }
              }}
              ref={(element) => {
                if (element) {
                  teamRefs.current.set(team.teamId, element)
                } else {
                  teamRefs.current.delete(team.teamId)
                }
              }}
              role="treeitem"
              tabIndex={0}
            >
              {canExpand ? `${isExpanded ? '축소' : '확장'} · ` : ''}
              {team.teamName}
              {selectedTeamId === team.teamId ? ' (선택됨)' : ''}
            </div>
            {canExpand && isExpanded ? renderNodes(team.children) : null}
          </li>
        )
      })}
    </ul>
  )

  return (
    <div aria-label="팀 계층" ref={treeRef} role="tree" tabIndex={-1}>
      {renderNodes(teams)}
    </div>
  )
}

function EmployeeDetail({ profile }: { profile: OrganizationEmployeeProfile }) {
  return (
    <section
      aria-labelledby="employee-detail-title"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 id="employee-detail-title">{profile.name} 직원 정보</h2>
      {profile.profileImageUrl ? (
        <img
          alt={`${profile.name} 프로필 사진`}
          className="h-20 w-20 rounded-full object-cover"
          src={profile.profileImageUrl}
        />
      ) : (
        <p
          aria-label={`${profile.name} 프로필 사진 없음`}
          className="rounded-full border border-border p-3"
        >
          프로필 사진 없음
        </p>
      )}
      <dl className="grid gap-2">
        <div>
          <dt>직급</dt>
          <dd>{profile.position}</dd>
        </div>
        <div>
          <dt>소속팀</dt>
          <dd>{profile.team}</dd>
        </div>
        <div>
          <dt>내선번호</dt>
          <dd>{profile.extensionNumber ?? '내선번호가 등록되지 않았습니다.'}</dd>
        </div>
        <div>
          <dt>회사 이메일</dt>
          <dd>회사 이메일: {profile.email}</dd>
        </div>
      </dl>
      <Status accountStatus={profile.accountStatus} workStatus={profile.workStatus} />
    </section>
  )
}

export function OrganizationChart() {
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam>()
  const [selectedEmployee, setSelectedEmployee] = useState<OrganizationEmployee>()
  const teamTreeRef = useRef<HTMLDivElement>(null)
  const employeesHeadingRef = useRef<HTMLHeadingElement>(null)
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  const pendingMobileFocusRef = useRef<'team-tree' | 'employees' | undefined>(undefined)
  const teamTreeQuery = useQuery({ queryKey: TEAM_TREE_QUERY_KEY, queryFn: getTeamTree })
  const employeesQuery = useQuery({
    queryKey: selectedTeam
      ? teamEmployeesQueryKey(selectedTeam.teamId)
      : ['organization-chart', 'employees', 'none'],
    queryFn: () => getTeamEmployees(selectedTeam!.teamId),
    enabled: selectedTeam !== undefined,
  })
  const profileQuery = useQuery({
    queryKey: selectedEmployee
      ? employeeProfileQueryKey(selectedEmployee.userId)
      : ['organization-chart', 'employee', 'none'],
    queryFn: () => getEmployeeProfile(selectedEmployee!.userId),
    enabled: selectedEmployee !== undefined,
  })

  useEffect(() => {
    if (selectedTeam) {
      employeesHeadingRef.current?.focus()
    }
  }, [selectedTeam])
  useEffect(() => {
    if (selectedEmployee && profileQuery.data) {
      detailHeadingRef.current?.focus()
    }
  }, [profileQuery.data, selectedEmployee])
  useEffect(() => {
    if (!selectedEmployee && pendingMobileFocusRef.current === 'employees') {
      employeesHeadingRef.current?.focus()
      pendingMobileFocusRef.current = undefined
    }
  }, [selectedEmployee])
  useEffect(() => {
    if (!selectedTeam && pendingMobileFocusRef.current === 'team-tree') {
      teamTreeRef.current?.focus()
      pendingMobileFocusRef.current = undefined
    }
  }, [selectedTeam])

  const returnToEmployees = () => {
    pendingMobileFocusRef.current = 'employees'
    setSelectedEmployee(undefined)
  }

  const returnToTeamTree = () => {
    pendingMobileFocusRef.current = 'team-tree'
    setSelectedEmployee(undefined)
    setSelectedTeam(undefined)
  }

  if (teamTreeQuery.isPending) {
    return <p aria-busy="true">팀 계층을 불러오는 중입니다.</p>
  }
  if (isUnauthenticated(teamTreeQuery.error)) {
    return <p role="alert">인증이 만료되었습니다. 다시 로그인해 주세요.</p>
  }
  if (teamTreeQuery.isError) {
    return (
      <section>
        <p role="alert">팀 계층을 불러올 수 없습니다.</p>
        <button onClick={() => void teamTreeQuery.refetch()} type="button">
          팀 계층 다시 시도
        </button>
      </section>
    )
  }

  const employeeContent = !selectedTeam ? (
    <p>팀을 선택하면 소속 직원을 확인할 수 있습니다.</p>
  ) : employeesQuery.isPending ? (
    <p aria-busy="true">직원 목록을 불러오는 중입니다.</p>
  ) : isUnauthenticated(employeesQuery.error) ? (
    <p role="alert">인증이 만료되었습니다. 다시 로그인해 주세요.</p>
  ) : employeesQuery.isError ? (
    <section>
      <p role="alert">직원 목록을 불러올 수 없습니다.</p>
      <button onClick={() => void employeesQuery.refetch()} type="button">
        직원 목록 다시 시도
      </button>
    </section>
  ) : employeesQuery.data?.length === 0 ? (
    <p>소속 직원이 없습니다.</p>
  ) : (
    <ul className="m-0 list-none space-y-2 p-0">
      {employeesQuery.data?.map((employee) => (
        <li key={employee.userId} className="rounded-lg border border-border p-3">
          <button
            className="font-semibold underline"
            onClick={() => setSelectedEmployee(employee)}
            type="button"
          >
            {employee.name} 직원 정보 보기
          </button>
          <p>{employee.position}</p>
          <Status accountStatus={employee.accountStatus} workStatus={employee.workStatus} />
        </li>
      ))}
    </ul>
  )

  const detailContent = !selectedEmployee ? (
    <p>직원을 선택하면 기본 정보를 확인할 수 있습니다.</p>
  ) : profileQuery.isPending ? (
    <p aria-busy="true">직원 정보를 불러오는 중입니다.</p>
  ) : isUnauthenticated(profileQuery.error) ? (
    <p role="alert">인증이 만료되었습니다. 다시 로그인해 주세요.</p>
  ) : profileQuery.error instanceof OrganizationChartApiError &&
    profileQuery.error.status === 404 ? (
    <p role="alert">선택한 직원을 찾을 수 없습니다.</p>
  ) : profileQuery.isError ? (
    <section>
      <p role="alert">직원 정보를 불러올 수 없습니다.</p>
      <button onClick={() => void profileQuery.refetch()} type="button">
        직원 정보 다시 시도
      </button>
    </section>
  ) : profileQuery.data ? (
    <EmployeeDetail profile={profileQuery.data} />
  ) : null

  return (
    <section aria-labelledby="organization-chart-title">
      <h1 id="organization-chart-title">조직도</h1>
      <p>팀을 선택하고 직원의 기본 정보를 확인하세요.</p>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className={selectedTeam ? 'hidden lg:block' : undefined}>
          <h2>팀 계층</h2>
          {teamTreeQuery.data?.length === 0 ? (
            <p>표시할 팀이 없습니다.</p>
          ) : (
            <TeamTree
              onSelect={(team) => {
                setSelectedTeam(team)
                setSelectedEmployee(undefined)
              }}
              selectedTeamId={selectedTeam?.teamId}
              teams={teamTreeQuery.data ?? []}
              treeRef={teamTreeRef}
            />
          )}
        </section>
        <section className={!selectedTeam || selectedEmployee ? 'hidden lg:block' : undefined}>
          <button className="mb-3 lg:hidden" onClick={returnToTeamTree} type="button">
            팀 계층으로 돌아가기
          </button>
          <h2 ref={employeesHeadingRef} tabIndex={-1}>
            {selectedTeam ? `${selectedTeam.teamName} 직원` : '직원 목록'}
          </h2>
          {employeeContent}
        </section>
        <section className={selectedEmployee ? undefined : 'hidden lg:block'}>
          <button className="mb-3 lg:hidden" onClick={returnToEmployees} type="button">
            직원 목록으로 돌아가기
          </button>
          <h2 ref={detailHeadingRef} tabIndex={-1}>
            직원 상세
          </h2>
          {detailContent}
        </section>
      </div>
    </section>
  )
}
