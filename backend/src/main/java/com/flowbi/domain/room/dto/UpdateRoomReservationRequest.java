package com.flowbi.domain.room.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "회의실 예약 수정 요청")
public record UpdateRoomReservationRequest(
    @Schema(description = "회의실 ID", example = "1") Long roomId,
    @Schema(description = "예약 제목", example = "분기 계획 회의") String title,
    @Schema(description = "예약 시작 일시", example = "2026-08-10T10:00:00") LocalDateTime startAt,
    @Schema(description = "예약 종료 일시", example = "2026-08-10T11:00:00") LocalDateTime endAt,
    @Schema(description = "참석자 사용자 ID 목록", example = "[10, 11]") List<Long> attendeeIds,
    @Schema(description = "예약 설명", example = "분기 계획을 논의합니다.") String description) {

  public UpdateRoomReservationCommand toCommand(Long reservationId) {
    return new UpdateRoomReservationCommand(reservationId, roomId, title, startAt, endAt,
        attendeeIds, description);
  }
}
