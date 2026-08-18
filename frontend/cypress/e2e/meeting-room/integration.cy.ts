import { meetingRoomTestGateway } from './test-gateway'

describe('meeting room contract integration', () => {
  it('starts a reservation from applied search filters without mixing later input, then closes and edits an owned reservation', () => {
    cy.viewport(1280, 800)
    cy.visit('/', {
      onBeforeLoad(window) {
        window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
      },
    })

    cy.get('input[type="date"]')
      .invoke('val')
      .then((appliedDate) => {
        cy.contains('label', '시작 시간').find('input').clear().type('10:10')
        cy.contains('label', '종료 시간').find('input').clear().type('11:20')
        cy.contains('button', '검색 적용').click()
        cy.contains('label', '시작 시간').find('input').clear().type('13:40')
        cy.contains('button', '한강 회의실 예약하기').click()
        cy.get('[role="dialog"]').within(() => {
          cy.contains('label', '날짜').find('input').should('have.value', appliedDate)
          cy.contains('label', '시작 시간').find('input').should('have.value', '10:10')
          cy.contains('label', '종료 시간').find('input').should('have.value', '11:20')
        })
      })
    cy.get('[data-testid="reservation-panel-overlay"]').click('topLeft')
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('button[aria-label="예약 수정: 제품 검토"]').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('h2', '제품 검토 예약 수정').should('be.focused')
    })
  })

  it('filters matching rooms while creating and then updating a reservation after each refresh', () => {
    cy.viewport(1280, 800)
    cy.visit('/', {
      onBeforeLoad(window) {
        window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
      },
    })

    cy.get('input[type="number"]').type('6')
    cy.get('select').select('예약중')
    cy.contains('button', '검색 적용').click()
    cy.contains('h2', '한강 회의실').should('be.visible')
    cy.contains('h2', '남산 회의실').should('not.exist')

    cy.contains('button', '한강 회의실 예약하기').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').type('통합 생성 회의')
      cy.contains('label', '참석자 ID').find('input').type('1')
      cy.contains('button', '참석자 추가').click()
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('예약과 연결 일정이 생성되었습니다.').should('be.visible')
      cy.contains('button', '닫기').click()
    })
    cy.contains('button', '통합 생성 회의 수정').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').clear().type('통합 수정 회의')
      cy.contains('button', '예약 및 일정 수정').click()
      cy.contains('예약과 연결 일정이 수정되었습니다.').should('be.visible')
    })
    cy.contains('button', '통합 수정 회의 수정').should('be.visible')
  })

  it('shows the authentication-pending state without treating it as an empty room list', () => {
    cy.visit('/', {
      onBeforeLoad(window) {
        window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway({
          availabilityFailure: 'AUTH_INTEGRATION_PENDING',
        })
      },
    })

    cy.contains('[role="alert"]', '인증 연동이 준비 중입니다').should('be.visible')
    cy.contains('조회된 회의실이 없습니다.').should('not.exist')
  })

  it('retains the availability recovery path after a transient query failure', () => {
    cy.visit('/', {
      onBeforeLoad(window) {
        window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway({
          availabilityFailure: 'TRANSIENT_ONCE',
        })
      },
    })

    cy.contains('[role="alert"]', '회의실 정보를 불러오지 못했습니다').should('be.visible')
    cy.contains('button', '다시 시도').click()
    cy.contains('h2', '한강 회의실').should('be.visible')
  })

  it('does not retain a previous date reservation after availability is re-queried', () => {
    cy.visit('/', {
      onBeforeLoad(window) {
        window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
      },
    })

    cy.contains('제품 검토').should('be.visible')
    cy.get('input[type="date"]').clear().type('2026-08-13')
    cy.contains('button', '검색 적용').click()
    cy.contains('제품 검토').should('not.exist')
  })

  it('recovers from create and update conflicts by refreshing availability while preserving edited input', () => {
    cy.visit('/', {
      onBeforeLoad(window) {
        window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
      },
    })

    cy.contains('button', '한강 회의실 예약하기').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').type('충돌 회의')
      cy.contains('label', '참석자 ID').find('input').type('1')
      cy.contains('button', '참석자 추가').click()
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('[role="alert"]', '다른 시간대를 선택').should('be.visible')
      cy.contains('button', '예약 현황 다시 조회').click()
      cy.contains('label', '예약 제목')
        .find('input')
        .should('have.value', '충돌 회의')
        .clear()
        .type('충돌 복구 회의')
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('예약과 연결 일정이 생성되었습니다.').should('be.visible')
    })
    cy.contains('button', '닫기').click()
    cy.get('button[aria-label="예약 수정: 제품 검토"]').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').clear().type('충돌 회의')
      cy.contains('button', '예약 및 일정 수정').click()
      cy.contains('[role="alert"]', '다른 시간대를 선택').should('be.visible')
      cy.contains('button', '예약 현황 다시 조회').click()
      cy.contains('label', '예약 제목')
        .find('input')
        .should('have.value', '충돌 회의')
        .clear()
        .type('수정 충돌 복구 회의')
      cy.contains('button', '예약 및 일정 수정').click()
      cy.contains('예약과 연결 일정이 수정되었습니다.').should('be.visible')
    })
    cy.contains('button', '수정 충돌 복구 회의 수정').should('be.visible')
  })

  it('performs the same create-and-update flow through the mobile text alternative', () => {
    cy.viewport('iphone-6')
    cy.visit('/', {
      onBeforeLoad(window) {
        window.__FLOW_BI_MEETING_ROOM_GATEWAY__ = meetingRoomTestGateway()
      },
    })

    cy.get('[aria-label="예약 텍스트 목록"]').should('be.visible')
    cy.contains('button', '한강 회의실 예약하기').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('h2', '한강 회의실 예약').should('be.focused')
      cy.contains('label', '예약 제목').find('input').type('모바일 통합 회의')
      cy.contains('label', '참석자 ID').find('input').type('1')
      cy.contains('button', '참석자 추가').click()
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('예약과 연결 일정이 생성되었습니다.').should('be.visible')
    })
    cy.contains('button', '닫기').click()
    cy.contains('button', '모바일 통합 회의 수정').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('h2', '모바일 통합 회의 예약 수정').should('be.focused')
      cy.contains('label', '예약 제목').find('input').clear().type('모바일 통합 수정 회의')
      cy.contains('button', '예약 및 일정 수정').click()
      cy.contains('예약과 연결 일정이 수정되었습니다.').should('be.visible')
    })
    cy.contains('button', '모바일 통합 수정 회의 수정').should('be.visible')
  })
})
