import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { scheduleActionError } from '../model/calendarPresentation'

import type {
  ScheduleDetail,
  ScheduleSummary,
  UpdateScheduleRequest,
} from '../api/scheduleCalendarApi'

type CalendarDataProps = {
  period: { from: string; to: string }
  selectedSchedule: number | null
  getSchedules: (
    period: { from: string; to: string },
    signal?: AbortSignal,
  ) => Promise<ScheduleSummary[]>
  getScheduleDetail: (id: number, signal?: AbortSignal) => Promise<ScheduleDetail>
  updateSchedule: (id: number, request: UpdateScheduleRequest) => Promise<ScheduleDetail>
  cancelSchedule: (id: number) => Promise<void>
  cancelRoomReservation: (id: number) => Promise<void>
  onUpdateSuccess: () => void
  onCancelSuccess: (roomManaged: boolean) => void
  onActionError: (message: string) => void
}

export function useScheduleCalendarData(props: CalendarDataProps) {
  const queryClient = useQueryClient()
  const scheduleListQueryKey = ['schedules', props.period.from, props.period.to] as const
  const schedulesQuery = useQuery({
    queryKey: scheduleListQueryKey,
    queryFn: ({ signal }) => props.getSchedules(props.period, signal),
    retry: false,
  })
  const detailQuery = useQuery({
    queryKey: ['schedule-detail', props.selectedSchedule],
    queryFn: ({ signal }) => props.getScheduleDetail(props.selectedSchedule as number, signal),
    enabled: props.selectedSchedule !== null,
    retry: false,
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateScheduleRequest }) =>
      props.updateSchedule(id, request),
    onSuccess: (updated) => {
      queryClient.setQueryData<ScheduleSummary[]>(scheduleListQueryKey, (schedules) =>
        schedules?.map((schedule) => (schedule.id === updated.id ? updated : schedule)),
      )
      queryClient.setQueryData(['schedule-detail', updated.id], updated)
      props.onUpdateSuccess()
    },
    onError: (error) => props.onActionError(scheduleActionError(error, 'update')),
  })
  const cancelMutation = useMutation({
    mutationFn: ({ id, kind }: { id: number; kind: 'schedule' | 'roomReservation' }) =>
      kind === 'roomReservation' ? props.cancelRoomReservation(id) : props.cancelSchedule(id),
    onSuccess: () => {
      if (props.selectedSchedule !== null) {
        queryClient.setQueryData<ScheduleSummary[]>(scheduleListQueryKey, (schedules) =>
          schedules?.filter((schedule) => schedule.id !== props.selectedSchedule),
        )
        queryClient.removeQueries({ queryKey: ['schedule-detail', props.selectedSchedule] })
      }
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule-detail'] })
      void queryClient.invalidateQueries({ queryKey: ['meeting-room'] })
      props.onCancelSuccess(detailQuery.data?.meetingRoomManaged ?? false)
    },
    onError: (error, variables) =>
      props.onActionError(
        scheduleActionError(
          error,
          variables.kind === 'roomReservation' ? 'roomReservationCancel' : 'cancel',
        ),
      ),
  })
  return {
    schedulesQuery,
    detailQuery,
    updateMutation,
    cancelMutation,
    clearAttendeeCandidates: () =>
      queryClient.removeQueries({ queryKey: ['schedule', 'attendee-candidates'] }),
  }
}
