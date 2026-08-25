import { describe, expect, it } from 'vitest'

import {
  createScheduleFormValues,
  scheduleDetailToFormValues,
  toScheduleRequest,
  type ScheduleFormValues,
} from '../../model/scheduleForm'

describe('shared schedule write contract', () => {
  it('keeps personal defaults and removes relations while preserving all-day API offsets', () => {
    const values: ScheduleFormValues = {
      ...createScheduleFormValues(),
      date: '2026-08-10',
      title: '개인 종일 일정',
      allDay: true,
      participantIds: [4],
      userTargetIds: [5],
      teamTargetIds: [6],
      projectTargetIds: [7],
    }

    expect(createScheduleFormValues()).toMatchObject({ type: 'PERSONAL', visibility: 'PRIVATE' })
    expect(toScheduleRequest(values)).toMatchObject({
      startAt: '2026-08-10T00:00:00+09:00',
      endAt: '2026-08-11T00:00:00+09:00',
      participantIds: [],
      userTargetIds: [],
      teamTargetIds: [],
      projectTargetIds: [],
    })
  })

  it('maps detail values into the same edit form shape', () => {
    expect(
      scheduleDetailToFormValues({
        id: 1,
        title: '팀 회의',
        startAt: '2026-08-10T09:30:00+09:00',
        endAt: '2026-08-10T10:30:00+09:00',
        allDay: false,
        type: 'TEAM',
        visibility: 'TEAM',
        colorLabel: 'BLUE',
        content: '',
        location: '',
        creatorAttends: true,
        participantIds: [2],
        participants: [{ userId: 2, displayName: '동료' }],
        attendeeCount: 2,
        userTargetIds: [],
        teamTargetIds: [3],
        projectTargetIds: [],
        meetingRoomManaged: false,
        canManage: true,
        roomReservationId: null,
        canCancelRoomReservation: false,
      }),
    ).toMatchObject({ date: '2026-08-10', startTime: '09:30', endTime: '10:30' })
  })
})
