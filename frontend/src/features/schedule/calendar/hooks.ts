import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createSchedule,
  deleteSchedule,
  fetchSchedule,
  fetchSchedules,
  updateSchedule,
} from './api'

import type { ScheduleFormValues } from './schema'
import type { CalendarView } from './types'

export function useSchedules(view: CalendarView, date: string) {
  return useQuery({
    queryKey: ['schedules', view, date],
    queryFn: () => fetchSchedules(view, date),
  })
}

export function useSchedule(scheduleId: number | null) {
  return useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => fetchSchedule(scheduleId ?? 0),
    enabled: scheduleId !== null,
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export function useUpdateSchedule(scheduleId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ScheduleFormValues) => updateSchedule(scheduleId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] })
    },
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
