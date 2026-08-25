import { describe, expect, it, vi } from 'vitest'

import {
  cancelRoomReservation,
  getScheduleDetail,
  type ScheduleCalendarApiError,
} from './scheduleCalendarApi'
import { authenticatedFetch } from '../../authenticatedFetch'

vi.mock('../../authenticatedFetch', () => ({ authenticatedFetch: vi.fn() }))

const mockedAuthenticatedFetch = vi.mocked(authenticatedFetch)

describe('scheduleCalendarApi', () => {
  it('reads the owner-only room reservation cancellation reference from schedule detail', async () => {
    mockedAuthenticatedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 1,
          roomReservationId: 17,
          canCancelRoomReservation: true,
        }),
        { status: 200 },
      ),
    )

    await expect(getScheduleDetail(1)).resolves.toMatchObject({
      roomReservationId: 17,
      canCancelRoomReservation: true,
    })
  })

  it('cancels a room reservation through its existing endpoint and preserves its error status', async () => {
    mockedAuthenticatedFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(cancelRoomReservation(17)).resolves.toBeUndefined()
    expect(mockedAuthenticatedFetch).toHaveBeenCalledWith('/api/room-reservations/17', {
      method: 'DELETE',
    })

    mockedAuthenticatedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'conflict' }), { status: 409 }),
    )
    await expect(cancelRoomReservation(17)).rejects.toEqual(
      expect.objectContaining<Partial<ScheduleCalendarApiError>>({ status: 409 }),
    )
  })
})
