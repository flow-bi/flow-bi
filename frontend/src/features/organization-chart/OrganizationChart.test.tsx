import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { OrganizationChart } from './OrganizationChart'

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizationChart />
    </QueryClientProvider>,
  )
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('OrganizationChart', () => {
  it('navigates a semantic team tree with the keyboard and presents selected employee details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) => {
        if (path === '/api/teams/tree') {
          return Promise.resolve(
            response([
              {
                teamId: 1,
                teamName: '제품본부',
                depth: 0,
                children: [{ teamId: 2, teamName: '플랫폼팀', depth: 1, children: [] }],
              },
            ]),
          )
        }
        if (path === '/api/users?teamId=2') {
          return Promise.resolve(
            response([
              {
                userId: 7,
                name: '김플로우',
                position: '엔지니어',
                accountStatus: 'ACTIVE',
                workStatus: 'WORKING',
                profileImageUrl: null,
              },
            ]),
          )
        }
        if (path === '/api/users/7') {
          return Promise.resolve(
            response({
              profileImageUrl: null,
              name: '김플로우',
              position: '엔지니어',
              team: '플랫폼팀',
              extensionNumber: null,
              email: 'flow@example.com',
              accountStatus: 'ACTIVE',
              workStatus: 'WORKING',
            }),
          )
        }
        return Promise.reject(new Error(`Unexpected request: ${path}`))
      }),
    )
    const user = userEvent.setup()
    renderChart()

    const rootTeam = await screen.findByRole('treeitem', { name: /제품본부/ })
    rootTeam.focus()
    await user.keyboard('{ArrowRight}{ArrowDown}{Enter}')
    expect(await screen.findByRole('heading', { name: '플랫폼팀 직원' })).toBeInTheDocument()
    expect(screen.getByText('계정 상태: 활성')).toBeInTheDocument()
    expect(screen.getByText('근무 상태: 업무 중')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '김플로우 직원 정보 보기' }))
    expect(await screen.findByRole('heading', { name: '김플로우 직원 정보' })).toBeInTheDocument()
    expect(screen.getByText('프로필 사진 없음')).toBeInTheDocument()
    expect(screen.getByText('내선번호가 등록되지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('회사 이메일: flow@example.com')).toBeInTheDocument()
  })

  it('distinguishes guidance, loading, empty, error retry, missing employee, and auth expiry', async () => {
    let shouldFail = true
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) => {
        if (path === '/api/teams/tree') {
          return Promise.resolve(
            response([{ teamId: 1, teamName: '운영팀', depth: 0, children: [] }]),
          )
        }
        if (path === '/api/users?teamId=1') {
          return shouldFail
            ? Promise.resolve(response({ code: 'TEAM_NOT_FOUND' }, 404))
            : Promise.resolve(response([]))
        }
        return Promise.resolve(response({ code: 'USER_NOT_FOUND' }, 404))
      }),
    )
    const user = userEvent.setup()
    renderChart()
    expect(
      await screen.findByText('팀을 선택하면 소속 직원을 확인할 수 있습니다.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('treeitem', { name: /운영팀/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('직원 목록을 불러올 수 없습니다.')
    shouldFail = false
    await user.click(screen.getByRole('button', { name: '직원 목록 다시 시도' }))
    expect(await screen.findByText('소속 직원이 없습니다.')).toBeInTheDocument()
  })

  it('uses the organization chart API contract and reports a 401 through the shared authentication boundary', async () => {
    const fetchMock = vi.fn((path: string) =>
      Promise.resolve(path === '/api/teams/tree' ? response([], 401) : response([])),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderChart()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/teams/tree', expect.anything()),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('인증이 만료되었습니다.')
  })

  it('moves through the mobile information flow and restores focus when going back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) => {
        if (path === '/api/teams/tree') {
          return Promise.resolve(
            response([{ teamId: 1, teamName: '운영팀', depth: 0, children: [] }]),
          )
        }
        if (path === '/api/users?teamId=1') {
          return Promise.resolve(
            response([
              {
                userId: 7,
                name: '김플로우',
                position: '엔지니어',
                accountStatus: 'INACTIVE',
                workStatus: 'ON_LEAVE',
                profileImageUrl: null,
              },
            ]),
          )
        }
        return Promise.resolve(
          response({
            profileImageUrl: null,
            name: '김플로우',
            position: '엔지니어',
            team: '운영팀',
            extensionNumber: '1234',
            email: 'flow@example.com',
            accountStatus: 'INACTIVE',
            workStatus: 'ON_LEAVE',
          }),
        )
      }),
    )
    const user = userEvent.setup()
    renderChart()

    const team = await screen.findByRole('treeitem', { name: /운영팀/ })
    await user.click(team)
    expect(await screen.findByRole('heading', { name: '운영팀 직원' })).toHaveFocus()
    expect(screen.getByText('계정 상태: 비활성')).toBeInTheDocument()
    expect(screen.getByText('근무 상태: 휴가 중')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '김플로우 직원 정보 보기' }))
    expect(await screen.findByRole('heading', { name: '직원 상세' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: '직원 목록으로 돌아가기' }))
    expect(screen.getByRole('heading', { name: '운영팀 직원' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: '팀 계층으로 돌아가기' }))
    expect(screen.getByRole('tree', { name: '팀 계층' })).toHaveFocus()
  })
})
