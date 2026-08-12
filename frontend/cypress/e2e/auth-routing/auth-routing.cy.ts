describe('authentication-based application routing', () => {
  it('shows login for an unauthenticated direct main URL', () => {
    cy.intercept('GET', '/api/auth/session', { statusCode: 401 })
    cy.visit('/')
    cy.get('h1').contains('로그인').should('be.visible')
    cy.location('pathname').should('eq', '/login')
  })

  it('routes a normal login to the main screen', () => {
    cy.intercept('GET', '/api/auth/session', { statusCode: 401 })
    cy.intercept('GET', '/api/auth/csrf', {
      statusCode: 204,
      headers: { 'set-cookie': 'XSRF-TOKEN=csrf-value; Path=/' },
    })
    cy.intercept('POST', '/api/auth/login', {
      body: { mustChangePassword: false },
      statusCode: 200,
    })
    cy.visit('/login')
    cy.get('#employee-number').type('TEST-1001')
    cy.get('#password').type('Synthetic!123')
    cy.get('button').contains('로그인').click()
    cy.get('h1').contains('콘텐츠').should('be.visible')
    cy.location('pathname').should('eq', '/')
  })

  it('routes a first login to password change and then main', () => {
    cy.intercept('GET', '/api/auth/session', {
      body: { authenticated: true, mustChangePassword: true },
      statusCode: 200,
    })
    cy.intercept('GET', '/api/auth/csrf', {
      statusCode: 204,
      headers: { 'set-cookie': 'XSRF-TOKEN=csrf-value; Path=/' },
    })
    cy.intercept('PUT', '/api/auth/password', {
      body: { mustChangePassword: false },
      statusCode: 200,
    })
    cy.visit('/')
    cy.get('h1').contains('비밀번호 변경').should('be.visible')
    cy.get('#new-password').type('Changed!1234')
    cy.get('#password-confirmation').type('Changed!1234')
    cy.get('button').contains('비밀번호 변경').click()
    cy.get('h1').contains('콘텐츠').should('be.visible')
  })
})
