const schedule = {
  id: 17,
  title: '소유한 회의실 예약',
  startAt: '2026-08-10T09:00:00+09:00',
  endAt: '2026-08-10T10:00:00+09:00',
  allDay: false,
  type: 'TEAM',
  colorLabel: 'BLUE',
}

const detail = {
  ...schedule,
  visibility: 'TEAM',
  content: '회의실 예약으로 생성된 일정',
  location: '회의실 A',
  creatorAttends: true,
  participantIds: [],
  userTargetIds: [],
  teamTargetIds: [10],
  projectTargetIds: [],
  meetingRoomManaged: true,
  canManage: false,
  roomReservationId: 31,
  canCancelRoomReservation: true,
}

const roomsWithReservation = {
  rooms: [
    {
      id: 1,
      name: '회의실 A',
      capacity: 8,
      location: '3층',
      usesDefaultImage: true,
      reservations: [
        {
          id: 31,
          title: schedule.title,
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          displayStatus: 'UPCOMING',
          canEdit: true,
        },
      ],
    },
  ],
}

function interceptReservationCancellation() {
  let cancelled = false
  cy.intercept('GET', '/api/auth/session', { authenticated: true, mustChangePassword: false })
  cy.intercept('GET', '/api/schedules?*', (request) => {
    request.reply({ body: cancelled ? [] : [schedule] })
  }).as('schedules')
  cy.intercept('GET', '/api/schedules/17', detail)
  cy.intercept('DELETE', '/api/room-reservations/31', (request) => {
    cancelled = true
    request.reply({ statusCode: 204 })
  }).as('cancelReservation')
  cy.intercept('GET', '/api/rooms?*', (request) => {
    request.reply({ body: cancelled ? { rooms: [] } : roomsWithReservation })
  }).as('rooms')
}

describe('calendar room reservation cancellation', () => {
  it('confirms, cancels once, and removes the reservation from calendar and room availability on desktop', () => {
    interceptReservationCancellation()
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', schedule.title).as('scheduleTrigger').click()
    cy.contains('button', '예약 취소').click()
    cy.get('[role="alertdialog"]')
      .should('contain.text', schedule.title)
      .and('contain.text', '예약과 연결된 일정이 함께 취소되어')
    cy.get('body').type('{esc}')
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.contains('button', '예약 취소').should('be.focused').click()
    cy.contains('button', '계속 예약 보기').click()
    cy.contains('button', '예약 취소').should('be.focused').click()
    cy.contains('button', '예약 취소 확정').dblclick()
    cy.wait('@cancelReservation')
    cy.get('@cancelReservation.all').should('have.length', 1)
    cy.contains('회의실 예약과 연결 일정이 취소되었습니다.').should('be.visible')
    cy.contains('button', schedule.title).should('not.exist')

    cy.contains('a', '회의실').click()
    cy.wait('@rooms')
    cy.contains(schedule.title).should('not.exist')
  })

  it('keeps the modal keyboard-accessible at a 390px mobile viewport', () => {
    cy.viewport(390, 844)
    interceptReservationCancellation()
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', schedule.title).click()
    cy.contains('button', '예약 취소').click()
    cy.get('[role="alertdialog"]').should('be.visible').find('button[aria-label="닫기"]').focus()
    cy.focused().type('{esc}')
    cy.contains('button', '예약 취소').should('be.focused')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
  })
})
