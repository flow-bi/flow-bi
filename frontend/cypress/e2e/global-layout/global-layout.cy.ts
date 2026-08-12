describe('global application layout', () => {
  function interceptAuthenticatedCalendar() {
    cy.intercept('GET', '/api/auth/session', { authenticated: true, mustChangePassword: false }).as(
      'session',
    )
    cy.intercept('GET', '/api/schedules?*', []).as('schedules')
  }

  it('lays out the header, sidebar, and main content on desktop', () => {
    cy.viewport(1280, 800)
    cy.visit('/')

    cy.get('[data-app-header]').should('contain.text', 'Flow BI').and('contain.text', '김유선')
    cy.get('[data-app-body]').should('have.class', 'md:grid')
    cy.get('nav[aria-label="주요 탐색"]').should('be.visible')
    cy.get('main[aria-label="콘텐츠"]').should('be.visible')
    cy.get('input[type="search"]').should('not.exist')
  })

  it('opens and closes the sidebar with keyboard controls on mobile', () => {
    cy.viewport('iphone-6')
    cy.visit('/')

    cy.get('[data-app-body]').should('not.have.class', 'grid')
    cy.get('[data-desktop-sidebar]').should('not.be.visible')
    cy.get('button[aria-label="사이드바 열기"]').click()
    cy.get('[role="dialog"][aria-label="주요 탐색"]').should('be.visible')
    cy.focused().type('{esc}')
    cy.get('[role="dialog"][aria-label="주요 탐색"]').should('not.exist')
    cy.get('button[aria-label="사이드바 열기"]').should('be.focused')
  })

  it('opens the monthly calendar from the desktop sidebar', () => {
    cy.viewport(1280, 800)
    interceptAuthenticatedCalendar()
    cy.visit('/')

    cy.get('nav[aria-label="주요 탐색"]').contains('a', '캘린더').click()

    cy.location('search').should('eq', '?view=month')
    cy.get('nav[aria-label="주요 탐색"] a[aria-current="page"]').should('contain.text', '캘린더')
    cy.contains('button', '월간 보기').should('have.attr', 'aria-pressed', 'true')
  })

  it('opens the monthly calendar and closes the mobile sidebar after navigation', () => {
    cy.viewport('iphone-6')
    interceptAuthenticatedCalendar()
    cy.visit('/')

    cy.get('button[aria-label="사이드바 열기"]').click()
    cy.get('[role="dialog"][aria-label="주요 탐색"]').contains('a', '캘린더').click()

    cy.location('search').should('eq', '?view=month')
    cy.get('[role="dialog"][aria-label="주요 탐색"]').should('not.exist')
    cy.contains('button', '월간 보기').should('have.attr', 'aria-pressed', 'true')
  })

  it('keeps the mobile calendar and create modal responsive after sidebar navigation', () => {
    cy.viewport(390, 844)
    interceptAuthenticatedCalendar()
    cy.visit('/')

    cy.get('button[aria-label="사이드바 열기"]').click()
    cy.get('[role="dialog"][aria-label="주요 탐색"]').contains('a', '캘린더').click()

    cy.get('[data-testid="calendar-grid"]').should('have.class', 'grid-cols-7')
    cy.contains('button', '일정 추가')
      .as('createTrigger')
      .should('have.class', 'bg-primary')
      .and('not.have.class', 'calendar-starter__create')
      .and('not.have.class', 'schedule-calendar__create')
      .click()
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('be.visible')
    cy.focused().should('have.id', 'schedule-title')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })

    cy.focused().type('{esc}')
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]').should('not.exist')
    cy.get('@createTrigger').should('be.focused')
  })
})
