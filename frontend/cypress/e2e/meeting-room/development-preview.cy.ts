describe('meeting room development preview', () => {
  it('loads the three initial rooms from /api/rooms without a test injection', () => {
    const rooms = {
      rooms: [
        {
          id: 1,
          name: '한강 회의실',
          capacity: 8,
          location: '3층',
          usesDefaultImage: true,
          reservations: [],
        },
        {
          id: 2,
          name: '남산 회의실',
          capacity: 4,
          location: '2층',
          usesDefaultImage: true,
          reservations: [],
        },
        {
          id: 3,
          name: '북한산 회의실',
          capacity: 12,
          location: '4층',
          usesDefaultImage: true,
          reservations: [],
        },
      ],
    }

    cy.viewport(1280, 800)
    cy.intercept('GET', '/api/auth/session', {
      body: { authenticated: true, mustChangePassword: false },
      statusCode: 200,
    })
    cy.intercept('GET', '/api/rooms?*', (request) => {
      expect(request.query).to.have.property('date')
      request.reply(rooms)
    }).as('rooms')
    cy.visit('/')

    cy.wait('@rooms')
    cy.contains('h2', '한강 회의실').should('be.visible')
    cy.contains('h2', '남산 회의실').should('be.visible')
    cy.contains('h2', '북한산 회의실').should('be.visible')
  })
})
