package com.flowbi.domain.meetingroom.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.flowbi.domain.schedule.dto.ScheduleTargetRequest;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public record ReservationRequest(
    @Schema(description = "변경할 회의실 ID", example = "2") @JsonProperty("room_id") Long roomId,
    @Schema(description = "예약 제목", example = "기획 회의") @NotBlank @Size(max = 200) String title,
    @Schema(description = "예약 시작 일시", example = "2026-07-05T09:00:00") @JsonProperty("start_at") @NotNull LocalDateTime startAt,
    @Schema(description = "예약 종료 일시", example = "2026-07-05T10:00:00") @JsonProperty("end_at") @NotNull LocalDateTime endAt,
    @Schema(description = "이용 예상 인원", example = "5") @Min(1) Integer count,
    @Schema(description = "회의 상세 설명") @Size(max = 255) String field,
    @Schema(description = "일정 유형", example = "PERSONAL") @JsonProperty("schedule_type") ScheduleType scheduleType,
    @Schema(description = "열람 가능 범위", example = "PRIVATE") ScheduleVisibility visibility,
    @Schema(description = "일정 색상 라벨", example = "파랑") @JsonProperty("color_label") @Size(max = 20) String colorLabel,
    @Schema(description = "일정 공유 대상 목록") @Valid List<ScheduleTargetRequest> targets) {
}
