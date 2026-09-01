import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const scheduleListQueryKey = ['schedules'] as const
export const scheduleDetailQueryKey = ['schedule-detail'] as const

export async function invalidateCreatedReservationQueries(
  queryClient: QueryClient,
  roomQueryKey: QueryKey,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: roomQueryKey, exact: true }),
    queryClient.invalidateQueries({ queryKey: scheduleListQueryKey }),
  ])
}

export async function invalidateUpdatedReservationQueries(
  queryClient: QueryClient,
  roomQueryKey: QueryKey,
) {
  await queryClient.invalidateQueries({ queryKey: roomQueryKey, exact: true })
}

export async function invalidateCancelledReservationQueries(
  queryClient: QueryClient,
  roomQueryKey: QueryKey,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: roomQueryKey, exact: true }),
    queryClient.invalidateQueries({ queryKey: scheduleListQueryKey }),
    queryClient.invalidateQueries({ queryKey: scheduleDetailQueryKey }),
  ])
}
