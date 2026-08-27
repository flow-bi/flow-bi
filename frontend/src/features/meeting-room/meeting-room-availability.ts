import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type {
  MeetingRoomGateway,
  RoomAvailabilityQuery,
  RoomAvailabilityResponse,
} from './meeting-room-gateway'

export const meetingRoomQueryKey = ['meeting-room'] as const

export function useRoomAvailability(
  gateway: MeetingRoomGateway,
  appliedSearch: RoomAvailabilityQuery,
  queryKeySearch: unknown = appliedSearch,
) {
  const [lastValidResponse, setLastValidResponse] = useState<RoomAvailabilityResponse>()
  const query = useQuery({
    queryKey: [...meetingRoomQueryKey, queryKeySearch],
    queryFn: async () => {
      const response = await gateway.findAvailability(appliedSearch)
      setLastValidResponse(response)
      return response
    },
    placeholderData: (previousData) => previousData,
    retry: false,
  })

  const data = query.data ?? lastValidResponse
  return { ...query, data, rooms: data?.rooms }
}
