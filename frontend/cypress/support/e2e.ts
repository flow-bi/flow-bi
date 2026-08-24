beforeEach(() => {
  cy.intercept('GET', '/api/me/header', {
    body: { name: '인증 사용자' },
    statusCode: 200,
  })
  cy.intercept('GET', '/api/rooms?*', {
    body: { rooms: [] },
    statusCode: 200,
  })
})

afterEach(() => {
  cy.clearCookies()
  cy.clearLocalStorage()
})
