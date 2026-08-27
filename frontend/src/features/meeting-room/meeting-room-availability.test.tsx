import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useRoomAvailability } from './meeting-room-availability'

import type { MeetingRoomGateway, RoomAvailabilityQuery } from './meeting-room-gateway'

function AvailabilityProbe({
  gateway,
  search,
}: {
  gateway: MeetingRoomGateway
  search: RoomAvailabilityQuery
}) {
  const availability = useRoomAvailability(gateway, search)
  return (
    <>
      {availability.isLoading ? <p role="status">loading</p> : null}
      {availability.isError ? <p role="alert">error</p> : null}
      <p>{availability.rooms?.map((room) => room.name).join(',') ?? 'none'}</p>
    </>
  )
}

describe('useRoomAvailability', () => {
  it('keeps the last valid rooms visible when the latest applied query fails', async () => {
    const findAvailability = vi
      .fn()
      .mockResolvedValueOnce({
        rooms: [
          {
            id: 1,
            name: '한강 회의실',
            capacity: 8,
            location: '3층',
            usesDefaultImage: true,
            reservations: [],
          },
        ],
      })
      .mockRejectedValueOnce(new Error('network'))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const gateway = { findAvailability } as MeetingRoomGateway
    const renderProbe = (search: RoomAvailabilityQuery) => (
      <QueryClientProvider client={queryClient}>
        <AvailabilityProbe gateway={gateway} search={search} />
      </QueryClientProvider>
    )
    const view = render(renderProbe({ date: '2026-08-07', startTime: '09:00', endTime: '18:00' }))

    expect(screen.getByRole('status')).toHaveTextContent('loading')
    expect(await screen.findByText('한강 회의실')).toBeInTheDocument()

    view.rerender(renderProbe({ date: '2026-08-08', startTime: '10:00', endTime: '11:00' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('error'))
    expect(screen.getByText('한강 회의실')).toBeInTheDocument()
    expect(findAvailability).toHaveBeenLastCalledWith({
      date: '2026-08-08',
      startTime: '10:00',
      endTime: '11:00',
    })
  })
})
