import { meetingRoomTestGateway } from './test-gateway'

function visitMeetingRooms() {
  cy.visit('/', {
    onBeforeLoad(window) {
      window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
    },
  })
}

function openUpdate() {
  cy.contains('button', '제품 검토 수정').click()
  cy.get('[role="dialog"]').should('be.visible').and('have.attr', 'aria-modal', 'true')
}

describe('meeting room reservation update', () => {
  it('loads an owned reservation, updates it, and refreshes the availability list', () => {
    cy.viewport(1280, 800)
    visitMeetingRooms()
    openUpdate()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('h2', '제품 검토 예약 수정').should('be.focused')
      cy.contains('label', '예약 제목')
        .find('input')
        .should('have.value', '제품 검토')
        .clear()
        .type('수정된 제품 검토')
      cy.contains('label', '상세 설명').find('textarea').should('have.value', '초기 설명')
      cy.contains('button', '예약 및 일정 수정').click()
      cy.contains('예약과 연결 일정이 수정되었습니다.').should('be.visible')
    })
    cy.contains('button', '수정된 제품 검토 수정').should('be.visible')
  })

  it('does not expose an update action for a reservation owned by another user', () => {
    visitMeetingRooms()
    cy.contains('내 것이 아닌 예약').should('be.visible')
    cy.contains('button', '내 것이 아닌 예약 수정').should('not.exist')
  })

  it('preserves edits after a conflict and asks the user to select another time', () => {
    visitMeetingRooms()
    openUpdate()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').clear().type('충돌 회의')
      cy.contains('button', '예약 및 일정 수정').click()
      cy.contains('이미 예약된 시간입니다. 다른 시간대를 선택한 뒤 다시 시도해 주세요.').should(
        'be.visible',
      )
      cy.contains('label', '예약 제목').find('input').should('have.value', '충돌 회의')
      cy.contains('예약 현황 다시 조회').click()
    })
  })

  it('provides the full-width, keyboard-focused update flow on mobile', () => {
    cy.viewport('iphone-6')
    visitMeetingRooms()
    openUpdate()
    cy.get('[role="dialog"]')
      .should('have.class', 'w-full')
      .within(() => {
        cy.contains('h2', '제품 검토 예약 수정').should('be.focused')
        cy.contains('button', '예약 및 일정 수정').click()
        cy.contains('예약과 연결 일정이 수정되었습니다.').should('be.visible')
      })
  })
})
