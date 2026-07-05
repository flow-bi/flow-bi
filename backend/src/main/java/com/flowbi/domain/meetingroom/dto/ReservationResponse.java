package com.flowbi.domain.meetingroom.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.flowbi.domain.meetingroom.entity.ReservationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public record ReservationResponse(
    @Schema(description = "예약 ID") @JsonProperty("reservation_id") Long reservationId,
    @Schema(description = "회의실 ID") @JsonProperty("room_id") Long roomId,
    @Schema(description = "연동 일정 ID") @JsonProperty("schedule_id") Long scheduleId,
    @Schema(description = "예약 제목") String title,
    @Schema(description = "예약 시작 일시") @JsonProperty("start_at") LocalDateTime startAt,
    @Schema(description = "예약 종료 일시") @JsonProperty("end_at") LocalDateTime endAt,
    @Schema(description = "예약 상태") ReservationStatus status,
    @Schema(description = "취소 일시") @JsonProperty("cancelled_at") LocalDateTime cancelledAt,
    @Schema(description = "이용 예상 인원") Integer count,
    @Schema(description = "회의 상세 설명") String field,
    @Schema(description = "예약 팀명") @JsonProperty("team_name") String teamName) {
}
