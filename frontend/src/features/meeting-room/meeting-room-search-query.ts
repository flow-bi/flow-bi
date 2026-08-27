import type { RoomAvailabilityQuery, RoomAvailabilityStatus } from './meeting-room-gateway'

export interface RoomAvailabilitySearchDraft {
  minimumCapacity: string
  date: string
  startTime: string
  endTime: string
  availabilityStatus: '' | RoomAvailabilityStatus
}

export function toRoomAvailabilityQuery(
  search: RoomAvailabilitySearchDraft,
): RoomAvailabilityQuery {
  return {
    date: search.date,
    startTime: search.startTime,
    endTime: search.endTime,
    ...(search.minimumCapacity === '' ? {} : { minimumCapacity: Number(search.minimumCapacity) }),
    ...(search.availabilityStatus === '' ? {} : { availabilityStatus: search.availabilityStatus }),
  }
}
