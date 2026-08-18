describe('login without synthetic credentials', () => {
  it('keeps credentials out of the page and returns only a created employee number to login', () => {
    cy.viewport(1280, 720)
    cy.intercept('GET', '/api/auth/session', { statusCode: 401 })
    cy.intercept('GET', '/api/dev/auth/employee-account-options', {
      statusCode: 200,
      body: { teams: [{ id: 1, name: 'Platform' }], positions: [{ id: 2, name: 'Engineer' }] },
    })
    cy.intercept('GET', '/api/auth/csrf', {
      statusCode: 204,
      headers: { 'set-cookie': 'XSRF-TOKEN=csrf-value; Path=/' },
    })
    cy.intercept('POST', '/api/dev/auth/employee-accounts', (request) => {
      expect(request.body).to.deep.equal({
        employeeNumber: 'DEV-2001',
        email: 'dev-2001@example.test',
        name: '개발 사용자',
        teamId: 1,
        positionId: 2,
        initialPassword: 'Initial!1234',
        confirmation: 'Initial!1234',
      })
      request.reply({
        statusCode: 201,
        body: { employeeNumber: 'DEV-2001', mustChangePassword: true },
      })
    })

    cy.visit('/login')
    cy.contains('개발 테스트 계정').should('not.exist')
    cy.contains('button', '직원 계정 생성').focus().should('be.focused').type('{enter}')
    cy.contains('button', '직원 계정 생성').click()
    cy.get('[role="dialog"][aria-labelledby="employee-account-title"]').within(() => {
      cy.get('#employee-number').type('DEV-2001')
      cy.get('#employee-email').type('dev-2001@example.test')
      cy.get('#employee-name').type('개발 사용자')
      cy.get('#employee-team').select('1')
      cy.get('#employee-position').select('2')
      cy.get('#initial-password').type('Initial!1234')
      cy.get('#password-confirmation').type('Initial!1234')
      cy.contains('button', '직원 계정 생성').click()
    })
    cy.get('#employee-number').should('have.value', 'DEV-2001')
    cy.get('#password').should('have.value', '')
  })

  it('keeps the development account entry accessible on mobile when the adapter is unavailable', () => {
    cy.viewport(390, 844)
    cy.intercept('GET', '/api/auth/session', { statusCode: 401 })
    cy.intercept('GET', '/api/dev/auth/employee-account-options', { statusCode: 404 })

    cy.visit('/login')
    cy.contains('button', '직원 계정 생성').focus().should('be.focused').type('{enter}')
    cy.contains('button', '직원 계정 생성').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="alert"]').should('be.visible')
    cy.get('button[aria-label="직원 계정 생성 모달 닫기"]').click()
    cy.contains('button', '직원 계정 생성').should('be.focused')
  })
})
