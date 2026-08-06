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
  cy.intercept('GET', '/api/schedules?*', [summary]).as('schedules')
  cy.intercept('GET', '/api/schedules/11', detail).as('detail')
}

describe('calendar schedule management', () => {
  it('creates a general schedule from the accessible desktop and mobile modal flows', () => {
    cy.viewport(1280, 800)
    interceptCalendar()
    cy.intercept('POST', '/api/schedules', (request) => {
      expect(request.body).to.include({
        title: '스프린트 계획',
        type: 'PERSONAL',
        visibility: 'PRIVATE',
        startAt: '2026-08-12T09:00:00+09:00',
        endAt: '2026-08-12T10:00:00+09:00',
      })
      request.reply({ statusCode: 201, body: {} })
    }).as('create')

    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '일정 추가').click()
    cy.get('#schedule-title').should('be.focused').type('스프린트 계획')
    cy.get('input[type="date"]').type('2026-08-12')
    cy.contains('button', '일정 저장').click()
    cy.wait('@create')
    cy.get('[role="dialog"]').should('not.exist')

    cy.viewport(390, 844)
    cy.contains('button', '일정 추가').click()
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('be.visible')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
    cy.get('#schedule-title').focus().type('{esc}')
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('not.exist')
  })

  it('edits and cancels only the selected schedule on desktop', () => {
    cy.viewport(1280, 800)
    interceptCalendar()
    cy.intercept('PUT', '/api/schedules/11', (request) => {
      const body = request.body as {
        title: string
        participantIds: number[]
        teamTargetIds: number[]
      }
      expect(body).to.include({ title: '수정된 스프린트 계획' })
      expect(body.participantIds).to.deep.equal([2, 3])
      expect(body.teamTargetIds).to.deep.equal([10])
      request.reply({ ...detail, title: body.title })
    }).as('update')
    cy.intercept('DELETE', '/api/schedules/11', { statusCode: 204 }).as('cancel')

    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '스프린트 계획').click()
    cy.contains('button', '일정 수정').click()
    cy.get('label[for="schedule-edit-title-input"]')
      .invoke('attr', 'for')
      .then((id) => cy.get(`#${id}`).clear().type('수정된 스프린트 계획'))
    cy.contains('button', '수정 저장').click()
    cy.wait('@update')
    cy.get('[role="dialog"]').should('contain.text', '수정된 스프린트 계획 상세')
    cy.contains('button', '일정 취소').click()
    cy.get('[role="alertdialog"]').should('contain.text', '수정된 스프린트 계획 취소')
    cy.contains('button', '일정 취소 확정').click()
    cy.wait('@cancel')
    cy.contains('일정이 취소되었습니다.').should('be.visible')
    cy.get('button[aria-label="2026년 8월 10일 일정 보기"]').should('be.focused')
  })

  it('keeps the management flow usable in the mobile overlay', () => {
    cy.viewport(390, 844)
    interceptCalendar()
    cy.visit('/?view=month&date=2026-08-10')

    cy.get('button[aria-label="2026년 8월 10일 일정 보기"]').focus().click()
    cy.get('[role="dialog"][aria-label="2026년 8월 10일 일정"]').within(() => {
      cy.contains('button', '스프린트 계획').click()
    })
    cy.get('[role="dialog"]').should('contain.text', '스프린트 계획 상세')
    cy.contains('button', '일정 수정').should('be.visible')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
  })
})
