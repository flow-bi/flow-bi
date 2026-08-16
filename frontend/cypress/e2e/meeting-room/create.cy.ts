import { meetingRoomTestGateway } from './test-gateway'

function visitMeetingRooms() {
  cy.visit('/', {
    onBeforeLoad(window) {
      window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
    },
  })
}

function openReservation() {
  cy.contains('button', '한강 회의실 예약하기').click()
  cy.get('[role="dialog"]')
    .should('be.visible')
    .and('have.attr', 'aria-labelledby', 'reservation-panel-title')
}

describe('meeting room reservation creation', () => {
  it('creates a reservation and its connected schedule with the test-only gateway', () => {
    cy.viewport(1280, 800)
    visitMeetingRooms()
    openReservation()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').type('정기 회의')
      cy.contains('label', '참석자 ID').find('input').type('1')
      cy.contains('button', '참석자 추가').click()
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('예약과 연결 일정이 생성되었습니다.').should('be.visible')
    })
  })

  it('keeps a reservation conflict visible and offers an availability refresh', () => {
    visitMeetingRooms()
    openReservation()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').type('충돌 회의')
      cy.contains('label', '참석자 ID').find('input').type('1')
      cy.contains('button', '참석자 추가').click()
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('이미 예약된 시간입니다. 다른 시간대를 선택한 뒤 다시 시도해 주세요.').should(
        'be.visible',
      )
      cy.contains('예약 현황 다시 조회').click()
      cy.contains('예약과 연결 일정이 생성되었습니다.').should('not.exist')
    })
  })

  it('uses the full-width overlay reservation flow on mobile', () => {
    cy.viewport('iphone-6')
    visitMeetingRooms()
    openReservation()
    cy.get('[role="dialog"]')
      .should('have.class', 'w-full')
      .within(() => {
        cy.contains('h2', '한강 회의실 예약').should('be.focused')
        cy.contains('label', '예약 제목').find('input').type('모바일 회의')
        cy.contains('label', '참석자 ID').find('input').type('1')
        cy.contains('button', '참석자 추가').click()
        cy.contains('button', '예약 및 일정 생성').click()
        cy.contains('예약과 연결 일정이 생성되었습니다.').should('be.visible')
      })
  })
})
