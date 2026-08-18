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
    cy.contains('사용 중').should('be.visible')
  })

  it('shows only rooms matching available and reserved statuses', () => {
    visitMeetingRooms()
    cy.get('select option').then(($options) => {
      expect([...$options].map((option) => option.textContent)).to.deep.equal([
        '전체',
        '예약 가능',
        '예약중',
      ])
    })
    cy.get('input[type="time"]').first().clear().type('10:00')
    cy.get('input[type="time"]').last().clear().type('11:00')
    cy.get('select').select('예약중')
    cy.contains('button', '검색 적용').click()
    cy.contains('h2', '한강 회의실').should('be.visible')
    cy.contains('h2', '남산 회의실').should('not.exist')
    cy.get('select').select('예약 가능')
    cy.contains('button', '검색 적용').click()
    cy.contains('h2', '한강 회의실').should('not.exist')
    cy.contains('h2', '남산 회의실').should('be.visible')
  })

  it('blocks keyboard-entered non-ten-minute search times and applies valid times', () => {
    visitMeetingRooms()
    cy.get('input[type="time"]').first().should('have.attr', 'step', '600')
    cy.get('input[type="time"]').first().clear().type('10:03')
    cy.contains('button', '검색 적용').click()
    cy.contains('시간은 10분 단위로 입력해 주세요. 예: 10:10').should('be.visible')
    cy.get('input[type="time"]').first().should('have.attr', 'aria-invalid', 'true')

    cy.get('input[type="time"]').first().clear().type('10:10')
    cy.contains('button', '검색 적용').click()
    cy.contains('시간은 10분 단위로 입력해 주세요. 예: 10:10').should('not.exist')
    cy.get('input[type="time"]').first().should('have.value', '10:10')
  })

  it('provides keyboard-accessible controls and a text reservation list on mobile', () => {
    cy.viewport('iphone-6')
    visitMeetingRooms()
    cy.get('input[type="number"]').focus().type('6')
    cy.focused().should('have.attr', 'type', 'number')
    cy.get('[aria-label="예약 텍스트 목록"]').should('be.visible')
    cy.contains('예약 팀: 제공되지 않음').should('be.visible')
    cy.contains('상태: 사용 중').should('be.visible')
  })
})
