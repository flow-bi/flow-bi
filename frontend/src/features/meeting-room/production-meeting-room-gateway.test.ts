import { describe, expect, it, vi } from 'vitest'

import { onUnauthenticated } from '../authenticatedFetch'
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
        expect.objectContaining({ credentials: 'include' }),
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
    const onSessionExpired = vi.fn()
    const unsubscribe = onUnauthenticated(onSessionExpired)
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
    expect(onSessionExpired).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('searches attendee candidates with a normalized query and exposes only display data', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ userId: 10, displayName: '김하늘' }] }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetch)

    await expect(
      productionMeetingRoomGateway.findAttendeeCandidates?.('  김   하늘  '),
    ).resolves.toEqual([{ userId: 10, displayName: '김하늘' }])
    expect(fetch).toHaveBeenCalledWith(
      '/api/schedules/attendee-candidates?query=%EA%B9%80%20%ED%95%98%EB%8A%98',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('maps the backend editable flag to the frontend edit permission', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            reservationId: 5,
            roomId: 1,
            title: '소유한 예약',
            startAt: '2026-08-10T09:00:00',
            endAt: '2026-08-10T10:00:00',
            attendeeIds: [10],
            attendees: [{ userId: 10, displayName: '김하늘' }],
            description: '',
            editable: true,
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(productionMeetingRoomGateway.getReservationForEdit?.(5)).resolves.toMatchObject({
      reservationId: 5,
      canEdit: true,
    })
  })

  it('cancels with a same-origin empty DELETE request and maps cancellation errors', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'ROOM_RESERVATION_CANCEL_CONFLICT' }), { status: 409 }),
      )
    vi.stubGlobal('fetch', fetch)

    await expect(productionMeetingRoomGateway.cancelReservation?.(5)).resolves.toBeUndefined()
    await expect(productionMeetingRoomGateway.cancelReservation?.(5)).rejects.toMatchObject({
      code: 'ROOM_RESERVATION_CANCEL_CONFLICT',
    })
    expect(fetch.mock.calls[0]).toEqual([
      '/api/room-reservations/5',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    ])
  })
})
