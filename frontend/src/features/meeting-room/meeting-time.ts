export const TIME_INPUT_STEP_SECONDS = 10 * 60
export const TEN_MINUTE_TIME_ERROR = '시간은 10분 단위로 입력해 주세요. 예: 10:10'

interface MeetingTimeErrors {
  startTime?: string
  endTime?: string
}

export function isTenMinuteTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  return match !== null && Number(match[2]) % 10 === 0
}

export function validateMeetingTimes(startTime: string, endTime: string): MeetingTimeErrors {
  const errors: MeetingTimeErrors = {}
  if (!startTime) {
    errors.startTime = '시작 시간을 선택해 주세요.'
  } else if (!isTenMinuteTime(startTime)) {
    errors.startTime = TEN_MINUTE_TIME_ERROR
  }
  if (!endTime) {
    errors.endTime = '종료 시간을 선택해 주세요.'
  } else if (!isTenMinuteTime(endTime)) {
    errors.endTime = TEN_MINUTE_TIME_ERROR
  }
  if (startTime && endTime && startTime >= endTime) {
    errors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다.'
  }
  if (startTime < '09:00' || startTime > '18:00' || endTime < '09:00' || endTime > '18:00') {
    errors.endTime = '예약 시간은 09:00부터 18:00 사이여야 합니다.'
  }
  return errors
}
