export { MeetingRoomPage } from './meeting-room-page'
export { createDevelopmentMeetingRoomGateway } from './development-meeting-room-gateway'
export {
  MeetingRoomGatewayError,
  productionMeetingRoomGateway,
  resolveMeetingRoomGateway,
} from './meeting-room-gateway'
export type {
  CreateRoomReservationCommand,
  CreateRoomReservationResult,
  MeetingRoomGateway,
  RoomAvailabilityQuery,
  RoomAvailabilityResponse,
  RoomAvailabilityStatus,
} from './meeting-room-gateway'
