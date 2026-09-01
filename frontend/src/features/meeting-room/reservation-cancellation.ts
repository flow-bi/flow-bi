import { useState } from 'react'

import { isMeetingRoomGatewayError } from './meeting-room-gateway'
import { invalidateCancelledReservationQueries } from './meeting-room-query-invalidation'

import type { QueryClient, QueryKey } from '@tanstack/react-query'

export interface CancellationTarget {
  reservation: { id: number; title: string; startAt?: string; endAt?: string }
  roomId: number
}

interface UseReservationCancellationOptions {
  cancelReservation?: (reservationId: number) => Promise<void>
  queryClient: QueryClient
  roomQueryKey: QueryKey
  onSuccess?: () => void
}

function cancellationMessage(error: unknown) {
  if (!isMeetingRoomGatewayError(error)) {
    return { message: '네트워크 오류로 예약 취소를 완료하지 못했습니다. 다시 시도해 주세요.' }
  }
  if (error.code === 'AUTH_INTEGRATION_PENDING') {
    return { message: '다시 로그인한 뒤 예약 취소를 다시 시도해 주세요.' }
  }
  if (error.code === 'ROOM_RESERVATION_NOT_FOUND') {
    return {
      message: '예약 취소 권한이 없거나 이미 사용할 수 없는 예약입니다.',
      refreshRecommended: true,
    }
  }
  if (error.code === 'ROOM_RESERVATION_CANCEL_CONFLICT') {
    return {
      message: '예약 상태가 변경되었습니다. 최신 예약 현황을 다시 조회한 뒤 시도해 주세요.',
      refreshRecommended: true,
    }
  }
  return { message: '예약 취소를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

export function useReservationCancellation({
  cancelReservation,
  queryClient,
  roomQueryKey,
  onSuccess,
}: UseReservationCancellationOptions) {
  const [target, setTarget] = useState<CancellationTarget>()
  const [error, setError] = useState<string>()
  const [isRefreshRecommended, setIsRefreshRecommended] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function open(reservation: CancellationTarget['reservation'], roomId: number) {
    setError(undefined)
    setIsRefreshRecommended(false)
    setTarget({ reservation, roomId })
  }

  function close() {
    if (isSubmitting) {
      return
    }
    setError(undefined)
    setIsRefreshRecommended(false)
    setTarget(undefined)
  }

  async function confirm() {
    if (!target || isSubmitting) {
      return
    }
    if (!cancelReservation) {
      setError('다시 로그인한 뒤 예약 취소를 다시 시도해 주세요.')
      return
    }
    setError(undefined)
    setIsRefreshRecommended(false)
    setIsSubmitting(true)
    try {
      await cancelReservation(target.reservation.id)
      await invalidateCancelledReservationQueries(queryClient, roomQueryKey)
      setTarget(undefined)
      onSuccess?.()
    } catch (caught) {
      const nextError = cancellationMessage(caught)
      setError(nextError.message)
      setIsRefreshRecommended(nextError.refreshRecommended === true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { target, error, isRefreshRecommended, isSubmitting, open, close, confirm }
}
