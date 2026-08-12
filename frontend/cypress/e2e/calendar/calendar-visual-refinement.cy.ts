describe('calendar visual refinement', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/auth/session', { authenticated: true, mustChangePassword: false })
    cy.intercept('GET', '/api/schedules?*', [])
  })

  it('emphasizes the current period and keeps desktop header controls aligned', () => {
    cy.viewport(1280, 800)
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('CALENDAR').should('not.exist')
    cy.get('[data-testid="calendar-header"]')
      .find('h1')
      .should('contain.text', '2026년 8월')
      .then(($heading) => {
        expect(Number.parseFloat(getComputedStyle($heading[0]).fontSize)).to.be.greaterThan(24)
        expect(getComputedStyle($heading[0]).fontWeight).to.match(/^(700|800|900)$/)
      })
    cy.get('[data-testid="calendar-header"]').should('have.css', 'align-items', 'center')
  })

  it('wraps controls in reading order and keeps the calendar within a 390px viewport', () => {
    cy.viewport(390, 844)
    cy.visit('/?view=month&date=2026-08-10')
    cy.get('[data-testid="calendar-view-controls"]').should('have.css', 'flex-wrap', 'wrap')
    cy.get('[data-testid="calendar-view-controls"]')
      .find('button')
      .then(($buttons) => {
        expect([...$buttons].map((button) => button.textContent?.trim())).to.deep.equal([
          '이전',
          '월간 보기',
          '주간 보기',
          '일간 보기',
          '다음',
        ])
      })
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
  })
})
