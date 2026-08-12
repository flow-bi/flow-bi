const summary = {
  id: 11,
  title: '스프린트 계획',
  startAt: '2026-08-10T09:00:00+09:00',
  endAt: '2026-08-10T10:00:00+09:00',
  allDay: false,
  type: 'TEAM',
  colorLabel: 'BLUE',
}

const detail = {
  ...summary,
  visibility: 'TEAM',
  content: '이번 주 목표를 정리합니다.',
  location: '회의실 A',
  creatorAttends: true,
  participantIds: [2, 3],
  userTargetIds: [],
  teamTargetIds: [10],
  projectTargetIds: [],
  meetingRoomManaged: false,
  canManage: true,
}

function interceptCalendar() {
  cy.intercept('GET', '/api/auth/session', { authenticated: true, mustChangePassword: false })
  cy.intercept('GET', '/api/schedules?*', [summary])
  cy.intercept('GET', '/api/schedules/11', detail)
}

describe('calendar modal dismissal', () => {
  it('dismisses a create modal from its backdrop but not its form, then returns focus', () => {
    interceptCalendar()
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '일정 추가').as('trigger').click()
    cy.get('[data-testid="schedule-create-panel"]').click().should('be.visible')
    cy.get('[data-testid="schedule-create-backdrop"]').click(1, 1)
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('not.exist')
    cy.get('@trigger').should('be.focused')

    cy.get('@trigger').click()
    cy.get('#schedule-title').click().type('초안')
    cy.get('[data-testid="schedule-create-backdrop"]').click(1, 1)
    cy.get('[role="alertdialog"]').should('contain.text', '입력한 내용을 버릴까요?')
    cy.contains('button', '계속 입력').click()
    cy.get('[data-testid="schedule-create-panel"]').click().should('be.visible')
    cy.get('[data-testid="schedule-create-backdrop"]').click(1, 1)
    cy.contains('button', '입력 취소하고 닫기').click()
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('not.exist')
    cy.get('@trigger').should('be.focused')
  })

  it('dismisses a detail modal only from its backdrop and returns focus to the schedule', () => {
    interceptCalendar()
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '스프린트 계획').as('trigger').click()
    cy.get('[role="dialog"] h2').click().should('be.visible')
    cy.get('[data-testid="schedule-detail-backdrop"]').click(1, 1)
    cy.get('[role="dialog"][aria-labelledby="schedule-detail-title"]').should('not.exist')
    cy.get('@trigger').should('be.focused')
  })
})
