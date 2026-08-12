import { meetingRoomTestGateway } from './test-gateway'

function visitMeetingRooms() {
  cy.visit('/', {
    onBeforeLoad(window) {
      window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
    },
  })
}

describe('meeting room availability', () => {
  it('shows rooms and the 09:00 to 18:00 reservation timetable on desktop', () => {
    cy.viewport(1280, 800)
    visitMeetingRooms()
    cy.contains('h1', '회의실 예약 현황').should('be.visible')
    cy.contains('h2', '한강 회의실').should('be.visible')
    cy.get('img[alt="한강 회의실 기본 이미지"]').should('be.visible')
    cy.get('[aria-label="9시부터 18시까지 예약 시간표"]').should('be.visible')
    cy.contains('제품 검토').should('be.visible')
    cy.contains('예약 예정').should('be.visible')
  })

  it('keeps a non-matching room available after applying search preferences', () => {
    visitMeetingRooms()
    cy.get('input[type="number"]').type('6')
    cy.get('select').select('예약 예정')
    cy.contains('button', '검색 적용').click()
    cy.contains('h2', '한강 회의실').should('be.visible')
    cy.contains('h2', '남산 회의실').should('be.visible')
  })

  it('provides keyboard-accessible controls and a text reservation list on mobile', () => {
    cy.viewport('iphone-6')
    visitMeetingRooms()
    cy.get('input[type="number"]').focus().type('6')
    cy.focused().should('have.attr', 'type', 'number')
    cy.get('[aria-label="예약 텍스트 목록"]').should('be.visible')
    cy.contains('예약 팀: 제공되지 않음').should('be.visible')
    cy.contains('상태: 예약 예정').should('be.visible')
  })
})
