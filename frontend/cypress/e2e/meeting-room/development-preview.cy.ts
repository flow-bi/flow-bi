describe('meeting room development preview', () => {
  it('uses the development gateway without a test injection', () => {
    cy.viewport(1280, 800)
    cy.visit('/meetingroom')

    cy.contains('인증 연동이 준비 중입니다').should('not.exist')
    cy.contains('h2', '한강 회의실').should('be.visible')
    cy.contains('h2', '남산 회의실').should('be.visible')

    cy.get('input[type="number"]').type('4')
    cy.contains('button', '검색 적용').click()
    cy.get('article h2').then(($headings) => {
      expect([...$headings].map((heading) => heading.textContent)).to.deep.equal([
        '한강 회의실',
        '남산 회의실',
      ])
    })

    cy.contains('button', '남산 회의실 예약하기').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', '예약 제목').find('input').type('개발 서버 확인 회의')
      cy.contains('label', '참석자 ID').find('input').type('1')
      cy.contains('button', '참석자 추가').click()
      cy.contains('button', '예약 및 일정 생성').click()
      cy.contains('예약과 연결 일정이 생성되었습니다.').should('be.visible')
      cy.contains('button', '닫기').click()
    })
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('개발 서버 확인 회의').should('be.visible')
  })
})
