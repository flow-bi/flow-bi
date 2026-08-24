import { meetingRoomTestGateway } from './test-gateway'

function visitMeetingRooms() {
  cy.visit('/', {
    onBeforeLoad(window) {
      window.__FLOW_BI_MEETING_ROOM_TEST_HARNESS__ = true
      window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
    },
  })
}

describe('meeting room reservation cancellation', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/auth/session', {
      body: { authenticated: true, mustChangePassword: false },
      statusCode: 200,
    })
  })

  it('cancels an owned reservation after confirmation and returns focus to its trigger', () => {
    cy.viewport(1280, 800)
    visitMeetingRooms()
    cy.get('button[aria-label="예약 취소: 제품 검토"]').click()
    cy.get('[role="alertdialog"]').within(() => {
      cy.contains('제품 검토 예약 취소 확인').should('be.visible')
      cy.contains('한강 회의실').should('be.visible')
      cy.contains('10:00–11:00').should('be.visible')
      cy.contains('button', '예약 취소 실행')
        .should('be.focused')
        .and(($button) => {
          expect($button.css('color')).not.to.equal($button.css('background-color'))
          expect($button.css('background-color')).not.to.equal('rgba(0, 0, 0, 0)')
        })
        .click()
    })
    cy.contains('예약과 연결 일정이 취소되어 기본 화면에서 사라졌습니다.').should('be.visible')
    cy.get('button').contains('한강 회의실 예약하기').should('be.focused')
    cy.get('button[aria-label="예약 취소: 제품 검토"]').should('not.exist')
  })

  it('sends a CSRF-protected empty DELETE without user identity parameters', () => {
    let availabilityRequests = 0
    cy.setCookie('XSRF-TOKEN', 'csrf-token')
    cy.setCookie('SESSION', 'test-session')
    cy.intercept('GET', '/api/me/header', { body: { name: '인증 사용자' }, statusCode: 200 })
    cy.intercept('GET', '/api/rooms?*', (request) => {
      availabilityRequests += 1
      request.reply({
        body: {
          rooms: [
            {
              id: 1,
              name: '한강 회의실',
              capacity: 8,
              location: '3층',
              usesDefaultImage: true,
              reservations:
                availabilityRequests === 1
                  ? [
                      {
                        id: 10,
                        title: '제품 검토',
                        startAt: '2026-08-21T10:00:00',
                        endAt: '2026-08-21T11:00:00',
                        displayStatus: 'UPCOMING',
                        canEdit: true,
                      },
                    ]
                  : [],
            },
          ],
        },
        statusCode: 200,
      })
    }).as('availability')
    cy.intercept('DELETE', '/api/room-reservations/10', (request) => {
      expect(request.headers['x-xsrf-token']).to.equal('csrf-token')
      expect(request.body).to.have.length(0)
      expect(request.url).not.to.include('userId')
      expect(request.url).not.to.include('role')
      request.reply({ statusCode: 204 })
    }).as('cancelReservation')

    cy.visit('/')
    cy.get('button[aria-label="예약 취소: 제품 검토"]').click()
    cy.contains('button', '예약 취소 실행').click()
    cy.wait('@cancelReservation')
    cy.wait('@availability')
    cy.get('button[aria-label="예약 취소: 제품 검토"]').should('not.exist')
  })

  it('closes confirmation with Escape without cancelling and never exposes a non-owner action', () => {
    cy.viewport('iphone-6')
    visitMeetingRooms()
    cy.get('button[aria-label="예약 취소: 제품 검토"]').click()
    cy.get('[role="alertdialog"]').should('be.visible').type('{esc}')
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.get('button[aria-label="예약 취소: 제품 검토"]').should('be.focused')
    cy.get('button[aria-label="예약 취소: 내 것이 아닌 예약"]').should('not.exist')
  })
})
