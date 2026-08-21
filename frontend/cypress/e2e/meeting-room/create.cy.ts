import { meetingRoomTestGateway } from './test-gateway'

function visitMeetingRooms() {
  cy.visit('/', {
    onBeforeLoad(window) {
      window.__FLOW_BI_MEETING_ROOM_TEST_HARNESS__ = true
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

  it('blocks keyboard-entered non-ten-minute reservation times and creates with valid times', () => {
    visitMeetingRooms()
    openReservation()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '시작 시간').find('input').should('have.attr', 'step', '600')
      cy.contains('label', '예약 제목').find('input').type('10분 단위 회의')
      cy.contains('label', '참석자 ID').find('input').type('1')
      cy.contains('button', '참석자 추가').click()
      cy.contains('label', '종료 시간').find('input').clear().type('10:20')
      cy.contains('label', '시작 시간').find('input').clear().type('10:03')
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('시간은 10분 단위로 입력해 주세요. 예: 10:10').should('be.visible')
      cy.contains('label', '시작 시간').find('input').should('have.attr', 'aria-invalid', 'true')

      cy.contains('label', '시작 시간').find('input').clear().type('10:10')
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('예약과 연결 일정이 생성되었습니다.').should('be.visible')
    })
  })

  it('closes a clean desktop panel from the overlay, keeps inside clicks open, and protects changed input', () => {
    cy.viewport(1280, 800)
    visitMeetingRooms()
    openReservation()
    cy.get('[role="dialog"]').click().should('be.visible')
    cy.get('[data-testid="reservation-panel-overlay"]').click('topLeft')
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('button', '한강 회의실 예약하기').should('be.focused').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').type('보호할 입력')
    })
    cy.get('[data-testid="reservation-panel-overlay"]').click('topLeft')
    cy.get('[role="alertdialog"]')
      .should('contain.text', '저장하지 않은 입력 내용이 있습니다.')
      .within(() => {
        cy.contains('button', '계속 입력').click()
      })
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').should('have.value', '보호할 입력')
      cy.contains('button', '닫기').click()
    })
    cy.contains('[role="alertdialog"] button', '입력 내용 삭제').click()
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

  it('closes a clean mobile panel from the overlay', () => {
    cy.viewport('iphone-6')
    visitMeetingRooms()
    openReservation()
    cy.get('[data-testid="reservation-panel-overlay"]').click('topLeft')
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('button', '한강 회의실 예약하기').should('be.focused')
  })
})
