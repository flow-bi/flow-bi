describe('development employee account modal', () => {
  it('creates an account with keyboard interaction and returns its employee number to login', () => {
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
        name: '개발 사용자',
        teamId: 1,
        positionId: 2,
        initialPassword: 'Initial!1234',
        confirmation: 'Initial!1234',
      })
      request.reply({ statusCode: 201, body: { employeeNumber: 'DEV-2001', mustChangePassword: true } })
    })
    cy.visit('/login', {
      onBeforeLoad(window) {
        window.__FLOW_BI_TEST_ACCOUNTS__ = {
          display: true,
          normal: { employeeNumber: 'TEST-1001', password: 'Synthetic!123' },
          passwordChange: { employeeNumber: 'TEST-1002', password: 'Synthetic!123' },
        }
      },
    })

    cy.contains('button', '직원 계정 생성').focus().type('{enter}')
    cy.get('[role="dialog"][aria-labelledby="employee-account-title"]').within(() => {
      cy.get('#employee-number').type('DEV-2001')
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
})
