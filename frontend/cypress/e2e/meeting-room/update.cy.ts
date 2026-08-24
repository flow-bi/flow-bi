import { meetingRoomTestGateway } from './test-gateway'

function visitMeetingRooms() {
  cy.visit('/', {
    onBeforeLoad(window) {
      window.__FLOW_BI_MEETING_ROOM_TEST_HARNESS__ = true
      window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
    },
  })
}

function openUpdate() {
  cy.get('button[aria-label="예약 수정: 제품 검토"]').click()
  cy.get('[role="dialog"]').should('be.visible').and('have.attr', 'aria-modal', 'true')
}

describe('meeting room reservation update', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/auth/session', {
      body: { authenticated: true, mustChangePassword: false },
      statusCode: 200,
    })
  })

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
      cy.contains('button', '김하늘 제거').should('be.visible').click()
      cy.contains('label', '참석자 검색').find('input').type('이바다')
      cy.contains('button', '이바다 참석자로 추가').click()
      cy.contains('button', '이바다 제거').should('be.visible')
      cy.contains('button', '예약 및 일정 수정').click()
      cy.contains('예약과 연결 일정이 수정되었습니다.').should('be.visible')
    })
    cy.get('button[aria-label="예약 수정: 수정된 제품 검토"]').should('be.visible')
  })

  it('does not expose an update action for a reservation owned by another user', () => {
    visitMeetingRooms()
    cy.contains('내 것이 아닌 예약').should('be.visible')
    cy.get('button[aria-label="예약 수정: 내 것이 아닌 예약"]').should('not.exist')
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

  it('protects changed update input when the overlay is clicked and restores the update trigger focus', () => {
    visitMeetingRooms()
    openUpdate()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').clear().type('수정 보호 입력')
    })
    cy.get('[data-testid="reservation-panel-overlay"]').click('topLeft')
    cy.get('[role="alertdialog"]')
      .scrollIntoView()
      .should('be.visible')
      .within(() => {
        cy.contains('button', '입력 내용 삭제').click()
      })
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('button[aria-label="예약 수정: 제품 검토"]').should('be.focused')
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
