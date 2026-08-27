import { productionMeetingRoomGateway } from './production-meeting-room-gateway'

import type { MeetingRoomGateway } from './meeting-room-gateway-contract'

export * from './meeting-room-gateway-contract'
export { productionMeetingRoomGateway } from './production-meeting-room-gateway'

interface ResolveMeetingRoomGatewayOptions {
  isTestHarness: boolean
  injectedGateway?: MeetingRoomGateway
}

export function resolveMeetingRoomGateway({
  isTestHarness,
  injectedGateway,
}: ResolveMeetingRoomGatewayOptions): MeetingRoomGateway {
  if (isTestHarness && injectedGateway) {
    return injectedGateway
  }
  return productionMeetingRoomGateway
}
