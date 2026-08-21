const schedule = {
  id: 11,
  title: '기존 일정',
  startAt: '2026-08-10T09:00:00+09:00',
  endAt: '2026-08-10T10:00:00+09:00',
  allDay: false,
  type: 'PERSONAL',
  colorLabel: 'BLUE',
}

interface CreateSchedulePayload {
  type: string
  visibility: string
  teamTargetIds: number[]
  projectTargetIds: number[]
}

describe('schedule target name selection', () => {
  it('selects project names and posts their IDs without raw target ID inputs', () => {
    cy.viewport(390, 844)
    cy.intercept('GET', '/api/auth/session', { authenticated: true, mustChangePassword: false })
    cy.intercept('GET', '/api/schedules?*', [schedule])
    cy.intercept('GET', '/api/schedules/target-options', {
      teams: [{ id: 10, name: '플랫폼 팀' }],
      projects: [
        { id: 20, name: '캘린더 개선' },
        { id: 21, name: '모바일 개선' },
      ],
    }).as('targetOptions')
    cy.intercept('POST', '/api/schedules', (request) => {
      const body = request.body as CreateSchedulePayload
      expect(body).to.include({ type: 'PROJECT', visibility: 'PROJECT' })
      expect(body.teamTargetIds).to.deep.equal([])
      expect(body.projectTargetIds).to.deep.equal([20, 21])
      request.reply({ statusCode: 201, body: {} })
    }).as('create')

    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '일정 추가').click()
    cy.contains('label', '일정 유형').find('select').select('PROJECT')
    cy.wait('@targetOptions')
    cy.get('fieldset').contains('legend', '프로젝트 대상').parent().as('targets')
    cy.get('@targets').contains('label', '캘린더 개선').find('input').check()
    cy.get('@targets').contains('label', '모바일 개선').find('input').check()
    cy.contains(['팀 대상', 'ID'].join(' ')).should('not.exist')
    cy.contains(['프로젝트 대상', 'ID'].join(' ')).should('not.exist')
    cy.get('#schedule-title').type('프로젝트 이름 선택')
    cy.get('input[type="date"]').type('2026-08-12')
    cy.contains('button', '일정 저장').click()
    cy.wait('@create')
    cy.get('[role="dialog"]').should('not.exist')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    })
  })
})
