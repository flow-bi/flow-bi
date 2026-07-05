import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelReservation,
  createReservation,
  fetchRoomReservations,
  fetchRooms,
  updateReservation,
} from './api'

import type { ReservationFormValues } from './schema'
import type { Reservation } from './types'

export function useRooms(params: {
  capacity?: string
  date: string
  timeRange?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => fetchRooms(params),
  })
}

export function useRoomReservations(roomId: number | null, date: string) {
  return useQuery({
    queryKey: ['room-reservations', roomId, date],
    queryFn: () => fetchRoomReservations(roomId ?? 0, date),
    enabled: roomId !== null,
  })
}

export function useRoomReservationMap(roomIds: number[], date: string) {
  const queries = useQueries({
    queries: roomIds.map((roomId) => ({
      queryKey: ['room-reservations', roomId, date],
      queryFn: () => fetchRoomReservations(roomId, date),
      enabled: roomId > 0,
    })),
  })

  return {
    reservationsByRoomId: new Map<number, Reservation[]>(
      roomIds.map((roomId, index) => [roomId, queries[index]?.data ?? []]),
    ),
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
  }
}

export function useCreateReservation(roomId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ReservationFormValues) => createReservation(roomId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] })
      void queryClient.invalidateQueries({ queryKey: ['room-reservations'] })
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export function useUpdateReservation(reservationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { roomId: number; values: ReservationFormValues }) =>
      updateReservation({ reservationId, ...params }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] })
      void queryClient.invalidateQueries({ queryKey: ['room-reservations'] })
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export function useCancelReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] })
      void queryClient.invalidateQueries({ queryKey: ['room-reservations'] })
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
