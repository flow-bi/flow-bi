import { describe, expect, it, vi } from 'vitest'

import { createDevelopmentMeetingRoomGateway } from './development-meeting-room-gateway'
import { resolveMeetingRoomGateway } from './meeting-room-gateway'
import { type MeetingRoomGateway } from './meeting-room-gateway-contract'
import { productionMeetingRoomGateway } from './production-meeting-room-gateway'

describe('developmentMeetingRoomGateway', () => {
  it('uses production in normal development and only uses an injected Cypress gateway', () => {
    const injectedGateway: MeetingRoomGateway = {
      findAvailability: vi.fn().mockResolvedValue({ rooms: [] }),
    }
    expect(
      resolveMeetingRoomGateway({
        isTestHarness: true,
      }),
    ).toBe(productionMeetingRoomGateway)
    expect(
      resolveMeetingRoomGateway({
        isTestHarness: false,
        injectedGateway,
      }),
    ).toBe(productionMeetingRoomGateway)
    expect(
      resolveMeetingRoomGateway({
        isTestHarness: true,
        injectedGateway,
      }),
    ).toBe(injectedGateway)
  })

  it('keeps development reservations in memory across create, update, and date queries', async () => {
    const gateway = createDevelopmentMeetingRoomGateway()
    const firstDate = '2026-08-12'
    const nextDate = '2026-08-13'

    const initial = await gateway.findAvailability({ date: firstDate, minimumCapacity: 6 })
    expect(initial.rooms.map((room) => room.name)).toEqual(['한강 회의실'])

    const created = await gateway.createReservation?.({
      roomId: 2,
      title: '개발 확인 회의',
      startAt: `${nextDate}T14:00:00`,
      endAt: `${nextDate}T15:00:00`,
      attendeeIds: [1],
      description: '개발 서버 수동 확인',
    })
    expect(created).toEqual({ reservationId: 100, scheduleId: 1000 })

    const nextDay = await gateway.findAvailability({ date: nextDate })
    expect(nextDay.rooms[1].reservations).toEqual([
      expect.objectContaining({ id: 100, title: '개발 확인 회의', canEdit: true }),
    ])
    expect((await gateway.findAvailability({ date: firstDate })).rooms[1].reservations).toEqual([])

    await gateway.updateReservation?.({
      reservationId: 100,
      roomId: 2,
      title: '수정된 개발 확인 회의',
      startAt: `${nextDate}T15:00:00`,
      endAt: `${nextDate}T16:00:00`,
      attendeeIds: [1],
      description: '수정 확인',
    })

    await expect(gateway.getReservationForEdit?.(100)).resolves.toEqual(
      expect.objectContaining({
        title: '수정된 개발 확인 회의',
        startAt: `${nextDate}T15:00:00`,
      }),
    )
  })

  it('returns rooms matching available and reserved search statuses', async () => {
    const gateway = createDevelopmentMeetingRoomGateway()

    const reserved = await gateway.findAvailability({
      date: '2026-08-12',
      startTime: '10:00',
      endTime: '11:00',
      availabilityStatus: 'RESERVED',
    })
    const available = await gateway.findAvailability({
      date: '2026-08-12',
      startTime: '10:00',
      endTime: '11:00',
      availabilityStatus: 'AVAILABLE',
    })

    expect(reserved.rooms.map((room) => room.name)).toEqual(['한강 회의실'])
    expect(available.rooms.map((room) => room.name)).toEqual(['남산 회의실'])
    expect(reserved.rooms[0].reservations[0]).toMatchObject({
      title: '제품 검토',
      displayStatus: 'IN_USE',
    })
  })

  it('rejects overlapping reservations without contacting an API', async () => {
    const gateway = createDevelopmentMeetingRoomGateway()
    const fetch = vi.spyOn(globalThis, 'fetch')

    await gateway.createReservation?.({
      roomId: 1,
      title: '첫 예약',
      startAt: '2026-08-13T13:00:00',
      endAt: '2026-08-13T14:00:00',
      attendeeIds: [1],
      description: '',
    })

    await expect(
      gateway.createReservation?.({
        roomId: 1,
        title: '겹치는 예약',
        startAt: '2026-08-13T13:30:00',
        endAt: '2026-08-13T14:30:00',
        attendeeIds: [1],
        description: '',
      }),
    ).rejects.toMatchObject({ code: 'ROOM_RESERVATION_CONFLICT' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
