function requiredElement(document: Document, selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) {
    throw new Error(`Expected ${selector} to exist`)
  }
  return element
}

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
    cy.get('[role="group"][aria-label="기간 이동"]')
      .find('button')
      .then(($buttons) => {
        expect([...$buttons].map((button) => button.textContent?.trim())).to.deep.equal([
          '이전',
          '오늘',
          '다음',
        ])
      })
    cy.get('[data-testid="calendar-view-controls"]').should('have.css', 'flex-wrap', 'wrap')
    cy.get('[data-testid="calendar-header-actions"]')
      .find('button')
      .then(($buttons) => {
        expect([...$buttons].map((button) => button.textContent?.trim())).to.deep.equal([
          '이전',
          '오늘',
          '다음',
          '월간 보기',
          '주간 보기',
          '일간 보기',
          '일정 추가',
        ])
      })
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
  })

  it('returns to the injected local today while preserving the current view and URL state', () => {
    const today = new Date(2026, 7, 18, 12)
    cy.clock(today.getTime())
    cy.viewport(1280, 800)
    cy.visit('/?view=week&date=2026-01-10')

    cy.get('[data-testid="calendar-period-controls"]').contains('button', '다음').click()
    cy.location('search').should('eq', '?view=week&date=2026-01-17')

    cy.get('[data-testid="calendar-period-controls"]').contains('button', '오늘').click()
    cy.location('search').should('eq', '?view=week&date=2026-08-18')
    cy.get('[data-testid="calendar-header"] h1').should('contain.text', '2026년 8월 16일')
  })

  it('visually separates header action groups and puts schedule creation at the desktop right edge', () => {
    cy.viewport(1280, 800)
    cy.visit('/?view=month&date=2026-08-10')

    cy.get('[data-testid="calendar-period-controls"]').should('be.visible')
    cy.get('[data-testid="calendar-view-controls"]').should('be.visible')
    cy.get('[data-testid="calendar-create-action"]').should('be.visible')
    cy.document().then((document) => {
      const periodControls = requiredElement(document, '[data-testid="calendar-period-controls"]')
      const viewControls = requiredElement(document, '[data-testid="calendar-view-controls"]')
      const createAction = requiredElement(document, '[data-testid="calendar-create-action"]')
      const createRect = createAction.getBoundingClientRect()
      expect(createRect.right).to.be.greaterThan(periodControls.getBoundingClientRect().right)
      expect(createRect.right).to.be.greaterThan(viewControls.getBoundingClientRect().right)

      const periodButton = requiredElement(
        document,
        '[data-testid="calendar-period-controls"] button',
      )
      const periodStyle = getComputedStyle(periodButton)
      const createStyle = getComputedStyle(createAction)
      expect(createStyle.backgroundColor).not.to.equal(periodStyle.backgroundColor)
      expect(createStyle.borderWidth).to.equal('0px')
      expect(periodStyle.borderWidth).not.to.equal('0px')
    })
  })

  it('keeps mobile actions visible, non-overlapping, keyboard reachable, and restores create focus', () => {
    cy.viewport(390, 844)
    cy.visit('/?view=month&date=2026-08-10')

    cy.get('[data-testid="calendar-header-actions"]')
      .find('button')
      .should('be.visible')
      .then(($buttons) => {
        expect([...$buttons].map((button) => button.textContent?.trim())).to.deep.equal([
          '이전',
          '오늘',
          '다음',
          '월간 보기',
          '주간 보기',
          '일간 보기',
          '일정 추가',
        ])
      })
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
    cy.document().then((document) => {
      const periodRect = requiredElement(
        document,
        '[data-testid="calendar-period-controls"]',
      ).getBoundingClientRect()
      const viewRect = requiredElement(
        document,
        '[data-testid="calendar-view-controls"]',
      ).getBoundingClientRect()
      const createRect = requiredElement(
        document,
        '[data-testid="calendar-create-action"]',
      ).getBoundingClientRect()
      expect(periodRect.bottom <= viewRect.top || viewRect.bottom <= periodRect.top).to.equal(true)
      expect(viewRect.bottom <= createRect.top || createRect.bottom <= viewRect.top).to.equal(true)
    })

    cy.get('[data-testid="calendar-period-controls"] button').first().focus().should('be.focused')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', '오늘')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', '다음')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', '월간 보기')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', '주간 보기')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', '일간 보기')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.text', '일정 추가').and('have.css', 'outline-style', 'solid')
    cy.focused().click()
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('be.visible')
    cy.focused().should('have.id', 'schedule-title').type('{esc}')
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('not.exist')
    cy.get('[data-testid="calendar-create-action"]').should('be.focused')
  })
})
