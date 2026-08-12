describe('global application layout', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/auth/session', {
      body: { authenticated: true, mustChangePassword: false },
      statusCode: 200,
    })
  })

  it('lays out the header, sidebar, and main content on desktop', () => {
    cy.viewport(1280, 800)
    cy.visit('/')

    cy.get('header').should('contain.text', 'Flow BI').and('contain.text', '김지선')
    cy.get('.app-body').should('have.css', 'display', 'grid')
    cy.get('nav[aria-label="주요 탐색"]').should('be.visible')
    cy.get('main[aria-label="콘텐츠"]').should('be.visible')
    cy.get('input[type="search"]').should('not.exist')
  })

  it('opens and closes the sidebar with keyboard controls on mobile', () => {
    cy.viewport('iphone-6')
    cy.visit('/')

    cy.get('.app-body').should('have.css', 'display', 'block')
    cy.get('.sidebar').should('not.be.visible')
    cy.get('button[aria-label="사이드바 열기"]').click()
    cy.get('[role="dialog"][aria-label="주요 탐색"]').should('be.visible')
    cy.focused().type('{esc}')
    cy.get('[role="dialog"][aria-label="주요 탐색"]').should('not.exist')
    cy.get('button[aria-label="사이드바 열기"]').should('be.focused')
  })
})
