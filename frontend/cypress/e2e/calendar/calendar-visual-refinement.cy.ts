function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector)
  if (!element) {
    throw new Error(`Expected ${selector} to exist`)
  }
  return element
}

function expectContainedByCard(card: HTMLElement, element: HTMLElement) {
  const cardRect = card.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  expect(elementRect.top).to.be.at.least(cardRect.top)
  expect(elementRect.right).to.be.at.most(cardRect.right)
  expect(elementRect.bottom).to.be.at.most(cardRect.bottom)
  expect(elementRect.left).to.be.at.least(cardRect.left)
}

function requiredCardButton(card: HTMLElement, name: string): HTMLButtonElement {
  const button = [...card.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) => element.textContent?.trim() === name,
  )
  if (!button) {
    throw new Error(`Expected alertdialog button ${name} to exist`)
  }
  return button
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

  it('keeps the edit-discard confirmation card contents contained on desktop and 390px mobile', () => {
    const detail = {
      id: 11,
      title: '수정할 일정',
      startAt: '2026-08-10T09:00:00+09:00',
      endAt: '2026-08-10T10:00:00+09:00',
      allDay: false,
      type: 'TEAM',
      colorLabel: 'BLUE',
      visibility: 'TEAM',
      content: '',
      location: '',
      creatorAttends: true,
      participantIds: [],
      userTargetIds: [],
      teamTargetIds: [10],
      projectTargetIds: [],
      meetingRoomManaged: false,
      canManage: true,
    }
    cy.intercept('GET', '/api/schedules?*', [detail])
    cy.intercept('GET', '/api/schedules/11', detail)
    cy.viewport(1280, 800)
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '수정할 일정').click()
    cy.contains('button', '일정 수정').click()
    cy.get('#schedule-edit-title-input').type(' 변경')
    cy.get('[role="dialog"][aria-labelledby="schedule-edit-title"]').click(1, 1)
    cy.get('[role="alertdialog"]').as('discard')
    cy.get('@discard').contains('button', '계속 수정').should('have.css', 'border-style', 'solid')
    cy.get('@discard')
      .contains('button', '수정 취소하고 닫기')
      .should('have.css', 'background-color')
      .and('not.equal', 'rgba(0, 0, 0, 0)')
    cy.document().then((document) => {
      const card = requiredElement(document, '[role="alertdialog"]')
      expectContainedByCard(card, requiredElement(card, '#edit-discard-title'))
      expectContainedByCard(card, requiredElement(card, 'button[aria-label="닫기"]'))
      expectContainedByCard(card, requiredCardButton(card, '계속 수정'))
      expectContainedByCard(card, requiredCardButton(card, '수정 취소하고 닫기'))
    })

    cy.viewport(390, 844)
    cy.get('@discard').find('button').should('be.visible')
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
      const card = requiredElement(document, '[role="alertdialog"]')
      const safe = requiredCardButton(card, '계속 수정')
      const danger = requiredCardButton(card, '수정 취소하고 닫기')
      expectContainedByCard(card, requiredElement(card, '#edit-discard-title'))
      expectContainedByCard(card, requiredElement(card, 'button[aria-label="닫기"]'))
      expectContainedByCard(card, safe)
      expectContainedByCard(card, danger)
      expect(safe.getBoundingClientRect().bottom).to.be.at.most(danger.getBoundingClientRect().top)
    })

    cy.get('@discard').contains('button', '계속 수정').click()
    cy.get('#schedule-edit-title-input').should('have.value', '수정할 일정 변경')
    cy.get(
      '[role="dialog"][aria-labelledby="schedule-edit-title"] button[aria-label="닫기"]',
    ).click()
    cy.get('@discard').contains('button', '수정 취소하고 닫기').click()
    cy.get('[role="dialog"][aria-labelledby="schedule-edit-title"]').should('not.exist')
  })

  it('keeps the create-discard confirmation card contents contained and preserves its draft', () => {
    cy.viewport(1280, 800)
    cy.visit('/?view=month&date=2026-08-10')
    cy.get('[data-testid="calendar-create-action"]').click()
    cy.get('#schedule-title').type('작성 중인 일정')
    cy.get('[data-testid="schedule-create-backdrop"]').click(1, 1)
    cy.get('[role="alertdialog"]').as('createDiscard')
    cy.get('@createDiscard').contains('p', '저장하지 않은 입력은 사라집니다.').should('be.visible')
    cy.document().then((document) => {
      const card = requiredElement(document, '[role="alertdialog"]')
      expectContainedByCard(card, requiredElement(card, '#discard-title'))
      expectContainedByCard(card, requiredElement(card, 'button[aria-label="닫기"]'))
      expectContainedByCard(card, requiredCardButton(card, '계속 입력'))
      expectContainedByCard(card, requiredCardButton(card, '입력 취소하고 닫기'))
    })

    cy.viewport(390, 844)
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
      const card = requiredElement(document, '[role="alertdialog"]')
      const safe = requiredCardButton(card, '계속 입력')
      const danger = requiredCardButton(card, '입력 취소하고 닫기')
      expectContainedByCard(card, safe)
      expectContainedByCard(card, danger)
      expect(safe.getBoundingClientRect().bottom).to.be.at.most(danger.getBoundingClientRect().top)
    })
    cy.get('@createDiscard').contains('button', '계속 입력').click()
    cy.get('#schedule-title').should('have.value', '작성 중인 일정')
  })

  it('keeps the cancellation confirmation card contents contained and returns to detail safely', () => {
    const detail = {
      id: 12,
      title: '취소할 일정',
      startAt: '2026-08-10T09:00:00+09:00',
      endAt: '2026-08-10T10:00:00+09:00',
      allDay: false,
      type: 'TEAM',
      colorLabel: 'BLUE',
      visibility: 'TEAM',
      content: '',
      location: '',
      creatorAttends: true,
      participantIds: [],
      userTargetIds: [],
      teamTargetIds: [10],
      projectTargetIds: [],
      meetingRoomManaged: false,
      canManage: true,
    }
    cy.intercept('GET', '/api/schedules?*', [detail])
    cy.intercept('GET', '/api/schedules/12', detail)
    cy.viewport(1280, 800)
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '취소할 일정').click()
    cy.contains('button', '일정 취소').click()
    cy.get('[role="alertdialog"]').as('cancellation')
    cy.document().then((document) => {
      const card = requiredElement(document, '[role="alertdialog"]')
      expectContainedByCard(card, requiredElement(card, '#cancel-title'))
      expectContainedByCard(card, requiredElement(card, 'button[aria-label="닫기"]'))
      expectContainedByCard(card, requiredCardButton(card, '계속 일정 보기'))
      expectContainedByCard(card, requiredCardButton(card, '일정 취소 확정'))
    })

    cy.viewport(390, 844)
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
      const card = requiredElement(document, '[role="alertdialog"]')
      const safe = requiredCardButton(card, '계속 일정 보기')
      const danger = requiredCardButton(card, '일정 취소 확정')
      expectContainedByCard(card, safe)
      expectContainedByCard(card, danger)
      expect(safe.getBoundingClientRect().bottom).to.be.at.most(danger.getBoundingClientRect().top)
    })
    cy.get('@cancellation').contains('button', '계속 일정 보기').click()
    cy.get('[role="dialog"][aria-labelledby="schedule-detail-title"]').should('be.visible')
  })
})
