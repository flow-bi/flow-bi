const teamSummary = {
  id: 41,
  title: '스프린트 참석자 점검',
  startAt: '2026-08-10T09:00:00+09:00',
  endAt: '2026-08-10T10:00:00+09:00',
  allDay: false,
  type: 'TEAM',
  colorLabel: 'BLUE',
}

interface ScheduleWritePayload {
  type: string
  visibility: string
  creatorAttends: boolean
  participantIds: number[]
  userTargetIds: number[]
}

const teamDetail = {
  ...teamSummary,
  visibility: 'TEAM',
  content: '',
  location: '',
  creatorAttends: true,
  participantIds: [102, 103],
  participants: [
    { userId: 102, displayName: '김민지' },
    { userId: 103, displayName: '이도윤' },
  ],
  attendeeCount: 3,
  userTargetIds: [],
  teamTargetIds: [10],
  projectTargetIds: [],
  meetingRoomManaged: false,
  canManage: true,
}

function interceptSessionAndSchedules(schedules: object[]) {
  cy.intercept('GET', '/api/auth/session', { authenticated: true, mustChangePassword: false })
  cy.intercept('GET', '/api/schedules?*', schedules)
}

describe('calendar attendee policy integration', () => {
  it('keeps personal schedules free of attendee controls and posts empty relationship arrays', () => {
    cy.viewport(1280, 800)
    interceptSessionAndSchedules([])
    cy.intercept('POST', '/api/schedules', (request) => {
      const body = request.body as ScheduleWritePayload
      expect(body).to.include({ type: 'PERSONAL', visibility: 'PRIVATE' })
      expect(body.participantIds).to.deep.equal([])
      expect(body.userTargetIds).to.deep.equal([])
      request.reply({ statusCode: 201, body: {} })
    }).as('createPersonal')

    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '일정 추가').click()
    cy.get('[role="dialog"]').should('not.contain.text', '참석자 검색')
    cy.get('[role="dialog"]').should('not.contain.text', '사용자 공유')
    cy.get('#schedule-title').type('개인 집중 시간')
    cy.get('input[type="date"]').type('2026-08-12')
    cy.contains('button', '일정 저장').click()
    cy.wait('@createPersonal')
  })

  it('does not offer the creator as another attendee when searching for a namesake', () => {
    cy.viewport(390, 844)
    interceptSessionAndSchedules([])
    cy.intercept('GET', '/api/schedules/target-options', {
      teams: [{ id: 10, name: '플랫폼팀' }],
      projects: [],
    }).as('getTargetOptions')
    // The API contract excludes the authenticated creator (201) by ID while retaining a namesake.
    cy.intercept('GET', '**/api/schedules/attendee-candidates?*', {
      body: {
        data: [{ userId: 202, displayName: '김민지' }],
      },
    }).as('searchCreatorAndNamesake')
    cy.intercept('POST', '/api/schedules', (request) => {
      const body = request.body as ScheduleWritePayload
      expect(body).to.include({ type: 'TEAM', visibility: 'TEAM', creatorAttends: true })
      expect(body.participantIds).to.deep.equal([202])
      expect(body.userTargetIds).to.deep.equal([])
      request.reply({ statusCode: 201, body: {} })
    }).as('createTeam')

    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '일정 추가').click()
    cy.contains('label', '일정 유형').find('select').select('TEAM')
    cy.wait('@getTargetOptions')
    cy.contains('label', '플랫폼팀').find('input').check()
    cy.contains('label', '등록자도 참석').find('input').focus().should('be.focused').check()
    cy.contains('label', '참석자 검색').find('input').focus().should('be.focused').type('김민지')
    cy.wait('@searchCreatorAndNamesake')

    cy.contains('자동 참석 인원: 1명').should('be.visible')
    cy.get('button').filter(':contains("김민지 참석자로 추가")').should('have.length', 1)
    cy.contains('button', '김민지 참석자로 추가').click()
    cy.contains('자동 참석 인원: 2명').should('be.visible')
    cy.get('#schedule-title').type('등록자 제외 참석자 검색')
    cy.get('input[type="date"]').type('2026-08-12')
    cy.contains('button', '일정 저장').click()
    cy.wait('@createTeam')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
  })

  it('edits team attendees by name or employee number and shows the saved names and count', () => {
    cy.viewport(390, 844)
    interceptSessionAndSchedules([teamSummary])
    cy.intercept('GET', '/api/schedules/41', teamDetail).as('getDetail')
    cy.intercept('GET', '/api/schedules/target-options', {
      teams: [{ id: 10, name: '플랫폼팀' }],
      projects: [],
    }).as('getTargetOptions')
    cy.intercept('GET', '**/api/schedules/attendee-candidates?*', (request) => {
      const candidates =
        request.query.query === 'E102'
          ? [
              { userId: 103, displayName: '이도윤' },
              { userId: 104, displayName: '박서준' },
            ]
          : []
      request.reply({
        body: {
          data: candidates,
        },
      })
    }).as('searchByEmployeeNumber')
    cy.intercept('PUT', '/api/schedules/41', (request) => {
      const body = request.body as ScheduleWritePayload
      expect(body.participantIds).to.deep.equal([103, 104])
      expect(body.userTargetIds).to.deep.equal([])
      request.reply({
        statusCode: 200,
        body: {
          ...teamDetail,
          participantIds: [103, 104],
          participants: [
            { userId: 103, displayName: '이도윤' },
            { userId: 104, displayName: '박서준' },
          ],
          attendeeCount: 3,
        },
      })
    }).as('updateAttendees')

    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', teamSummary.title).click()
    cy.wait('@getDetail')
    cy.get('[aria-label="참석자 정보"]')
      .should('contain.text', '참석 인원: 3명')
      .and('contain.text', '등록자 참석: 예')
      .and('contain.text', '김민지')
      .and('contain.text', '이도윤')
      .and('not.contain.text', '102')
    cy.contains('button', '일정 수정').click()
    cy.get('[role="dialog"]').as('edit')
    cy.wait('@getTargetOptions')
    cy.get('@edit').contains('label', '플랫폼팀').find('input').should('be.checked')
    cy.get('@edit').should('contain.text', '플랫폼팀').and('not.contain.text', '팀 대상 ID')
    cy.get('@edit').should('contain.text', '김민지').and('contain.text', '이도윤')
    cy.get('@edit').should('not.contain.text', '참석자 ID')
    cy.get('@edit').find('button[aria-label="김민지 참석자 제거"]').click()
    cy.get('@edit')
      .find('fieldset')
      .contains('legend', '참석자')
      .parent()
      .find('input')
      .type('E102')
    cy.wait('@searchByEmployeeNumber')
    cy.contains('button', '박서준 참석자로 추가').click()
    cy.contains('button', '박서준 참석자로 추가').click()
    cy.contains('이미 선택된 참석자입니다.').should('be.visible')
    cy.contains('button', '수정 저장').click()
    cy.wait('@updateAttendees')
    cy.get('[role="dialog"][aria-labelledby="schedule-detail-title"]')
      .should('contain.text', '이도윤')
      .and('contain.text', '박서준')
      .and('contain.text', '참석 인원: 3명')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
  })

  it('shows room-managed attendees but does not offer direct calendar editing', () => {
    cy.viewport(1280, 800)
    const managedSchedule = { ...teamSummary, id: 42, title: '회의실 예약 일정' }
    interceptSessionAndSchedules([managedSchedule])
    cy.intercept('GET', '/api/schedules/42', {
      ...teamDetail,
      ...managedSchedule,
      participants: [{ userId: 104, displayName: '박서준' }],
      participantIds: [104],
      attendeeCount: 2,
      meetingRoomManaged: true,
    })

    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', managedSchedule.title).click()
    cy.get('[aria-label="참석자 정보"]').should('contain.text', '박서준')
    cy.contains('회의실 예약에서 관리하는 일정입니다.').should('be.visible')
    cy.contains('button', '일정 수정').should('not.exist')
  })
})
