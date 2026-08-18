const schedules = [
  {
    id: 1,
    title: '종일 빨강 일정',
    startAt: '2026-08-10T00:00:00+09:00',
    endAt: '2026-08-11T00:00:00+09:00',
    allDay: true,
    type: 'PERSONAL',
    colorLabel: 'RED',
  },
  {
    id: 2,
    title: '오전 주황 회의',
    startAt: '2026-08-10T09:00:00+09:00',
    endAt: '2026-08-10T10:00:00+09:00',
    allDay: false,
    type: 'TEAM',
    colorLabel: 'ORANGE',
  },
  {
    id: 3,
    title: '노랑 검토',
    startAt: '2026-08-10T09:30:00+09:00',
    endAt: '2026-08-10T10:30:00+09:00',
    allDay: false,
    type: 'PROJECT',
    colorLabel: 'YELLOW',
  },
  {
    id: 4,
    title: '초록 점검',
    startAt: '2026-08-10T12:00:00+09:00',
    endAt: '2026-08-10T13:00:00+09:00',
    allDay: false,
    type: 'PERSONAL',
    colorLabel: 'GREEN',
  },
  {
    id: 5,
    title: '파랑 공유',
    startAt: '2026-08-10T14:00:00+09:00',
    endAt: '2026-08-10T15:00:00+09:00',
    allDay: false,
    type: 'TEAM',
    colorLabel: 'BLUE',
  },
  {
    id: 6,
    title: '보라 마감',
    startAt: '2026-08-10T16:00:00+09:00',
    endAt: '2026-08-10T17:30:00+09:00',
    allDay: false,
    type: 'PROJECT',
    colorLabel: 'PURPLE',
  },
]

const detail = {
  ...schedules[1],
  visibility: 'TEAM',
  content: '일정 표시 계약을 검증합니다.',
  location: '회의실 A',
  creatorAttends: true,
  participantIds: [],
  userTargetIds: [],
  teamTargetIds: [10],
  projectTargetIds: [],
  meetingRoomManaged: false,
  canManage: true,
}

function interceptCalendar() {
  cy.intercept('GET', '/api/auth/session', { authenticated: true, mustChangePassword: false })
  cy.intercept('GET', '/api/schedules?*', schedules)
  cy.intercept('GET', '/api/schedules/2', detail)
}

function expectNoRawColors() {
  cy.get('main')
    .invoke('text')
    .should((text) => {
      for (const color of ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE']) {
        expect(text).not.to.contain(color)
      }
    })
}

describe('calendar display contract', () => {
  beforeEach(interceptCalendar)

  it('uses distinct computed schedule backgrounds without exposing raw color enums in month, week, and day views', () => {
    for (const view of ['month', 'week', 'day']) {
      cy.visit(`/?view=${view}&date=2026-08-10`)
      expectNoRawColors()
      if (view === 'day') {
        cy.contains('2026년 8월 10일 09:00–10:00').should('be.visible')
      } else {
        cy.contains('button', '오전 주황 회의')
          .should('have.text', '오전 주황 회의 · 팀')
          .and('not.contain.text', '2026년 8월 10일')
      }
      cy.contains('2026-08-10T09:00:00+09:00').should('not.exist')

      cy.contains('button', '오전 주황 회의')
        .then(($orange) => getComputedStyle($orange[0]).backgroundColor)
        .then((orangeBackground) => {
          cy.contains('button', '파랑 공유')
            .then(($blue) => getComputedStyle($blue[0]).backgroundColor)
            .should('not.equal', orangeBackground)
        })
    }
  })

  it('separates all-day schedules and maps timed schedules to the 24-hour vertical timeline', () => {
    cy.visit('/?view=day&date=2026-08-10')
    cy.get('[data-testid="calendar-day-all-day"]').should('contain.text', '종일 빨강 일정')
    cy.get('[data-testid="calendar-day-time-labels"]')
      .should('contain.text', '00:00')
      .and('contain.text', '24:00')
    cy.get('[data-testid="calendar-day-timed-2"]')
      .should('have.css', 'top', '540px')
      .and('have.css', 'height', '60px')
    cy.get('[data-testid="calendar-day-timed-2"]').then(($first) => {
      cy.get('[data-testid="calendar-day-timed-3"]').then(($second) => {
        expect(getComputedStyle($first[0]).left).not.to.equal(getComputedStyle($second[0]).left)
      })
    })
  })

  it('uses the readable Korean date format in the date schedule panel', () => {
    cy.visit('/?view=month&date=2026-08-10')
    cy.get('button[aria-label="2026년 8월 10일 일정 보기"]').click()
    cy.get('[role="dialog"][aria-label="2026년 8월 10일 일정"]')
      .as('datePanel')
      .find('h2')
      .should('have.text', '2026년 8월 10일 일정')
    cy.get('@datePanel')
      .find('[data-testid="calendar-day-timed-2"]')
      .should('have.css', 'top', '540px')
      .and('have.css', 'height', '60px')
    cy.get('[data-testid="calendar-date-panel-backdrop"]').click('topLeft')
    cy.get('@datePanel').should('not.exist')
  })

  it('provides top-right close controls and keeps modal footers for work actions', () => {
    cy.visit('/?view=month&date=2026-08-10')
    cy.contains('button', '오전 주황 회의').click()
    cy.get('[role="dialog"]').as('detail')
    cy.get('@detail').find('button[aria-label="닫기"]').should('have.length', 1)
    cy.get('@detail')
      .find('button')
      .should('contain.text', '일정 수정')
      .and('contain.text', '일정 취소')
    cy.get('@detail').find('button').should('not.contain.text', '닫기')

    cy.contains('button', '일정 수정').click()
    cy.get('[role="dialog"][aria-labelledby="schedule-edit-title"]').as('edit')
    cy.get('@edit').find('button[aria-label="닫기"]').should('have.length', 1)
    cy.get('@edit').find('button[type="submit"]').should('contain.text', '수정 저장')

    cy.get('@edit').find('button[aria-label="닫기"]').click()
    cy.contains('button', '일정 취소').click()
    cy.get('[role="alertdialog"]').as('cancel')
    cy.get('@cancel').find('button[aria-label="닫기"]').should('have.length', 1)
    cy.get('@cancel').find('button').should('contain.text', '일정 취소 확정')

    cy.get('@cancel').find('button[aria-label="닫기"]').click()
    cy.get('@detail').find('button[aria-label="닫기"]').click()
    cy.get('[data-testid="calendar-header"]').contains('button', '일정 추가').click()
    cy.get('[role="dialog"][aria-labelledby="schedule-create-title"]')
      .find('button')
      .contains('닫기')
      .should('have.length', 1)
    cy.get('[data-testid="schedule-all-day-field"]')
      .should('have.css', 'display', 'flex')
      .and('have.css', 'align-items', 'center')
    cy.get('[data-testid="schedule-creator-attends-field"]')
      .should('have.css', 'display', 'flex')
      .and('have.css', 'align-items', 'center')
  })
})
