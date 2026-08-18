import { describe, expect, it, vi } from 'vitest'

import { productionMeetingRoomGateway } from './meeting-room-gateway'

describe('productionMeetingRoomGateway', () => {
  it('uses same-origin session requests and never sends a user identity', async () => {
    const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ reservationId: 5, scheduleId: 9 }), { status: 201 }),
      ),
    )
    vi.stubGlobal('fetch', fetch)

    await productionMeetingRoomGateway.findAvailability({
      date: '2026-08-10',
      startTime: '09:00',
      endTime: '10:00',
      minimumCapacity: 4,
      availabilityStatus: 'AVAILABLE',
    })
    await productionMeetingRoomGateway.createReservation?.({
      roomId: 1,
      title: '계약 검증',
      startAt: '2026-08-10T09:00:00',
      endAt: '2026-08-10T10:00:00',
      attendeeIds: [10, 11],
      description: '설명',
    })
    await productionMeetingRoomGateway.updateReservation?.({
      reservationId: 5,
      roomId: 1,
      title: '수정',
      startAt: '2026-08-10T10:00:00',
      endAt: '2026-08-10T11:00:00',
      attendeeIds: [10],
      description: '',
    })
    expect(fetch.mock.calls).toEqual([
      [
        '/api/rooms?date=2026-08-10&startTime=09%3A00&endTime=10%3A00&minimumCapacity=4&availabilityStatus=AVAILABLE',
        { credentials: 'include' },
      ],
      [
        '/api/room-reservations',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      ],
      [
        '/api/room-reservations/5',
        expect.objectContaining({ method: 'PUT', credentials: 'include' }),
      ],
    ])
    for (const [, options] of fetch.mock.calls.slice(1, 3)) {
      expect(JSON.parse((options as RequestInit).body as string)).not.toHaveProperty('userId')
      expect(JSON.parse((options as RequestInit).body as string)).not.toHaveProperty('role')
      expect(JSON.parse((options as RequestInit).body as string)).not.toHaveProperty(
        'reservationId',
      )
    }
  })

  it('maps authentication and stable backend errors without exposing backend messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'AUTHENTICATION_REQUIRED', message: 'internal' }), {
          status: 401,
        }),
      ),
    )

    await expect(
      productionMeetingRoomGateway.findAvailability({ date: '2026-08-10' }),
    ).rejects.toMatchObject({
      code: 'AUTH_INTEGRATION_PENDING',
    })
  })
})
