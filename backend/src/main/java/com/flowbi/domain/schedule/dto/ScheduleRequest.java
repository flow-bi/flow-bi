package com.flowbi.domain.schedule.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public record ScheduleRequest(
    @Schema(description = "일정 제목", example = "주간 회의") @NotBlank @Size(max = 200) String title,
    @Schema(description = "일정 유형", example = "TEAM") @JsonProperty("schedule_type") @NotNull ScheduleType scheduleType,
    @Schema(description = "열람 가능 범위", example = "PRIVATE") @NotNull ScheduleVisibility visibility,
    @Schema(description = "시작 일시", example = "2026-07-05T09:00:00") @JsonProperty("start_at") @NotNull LocalDateTime startAt,
    @Schema(description = "종료 일시", example = "2026-07-05T10:00:00") @JsonProperty("end_at") @NotNull LocalDateTime endAt,
    @Schema(description = "색상 라벨", example = "파랑") @JsonProperty("color_label") @Size(max = 20) String colorLabel,
    @Schema(description = "장소", example = "본관 3층") @Size(max = 30) String location,
    @Schema(description = "일정 상세 설명") @Size(max = 200) String content,
    @Schema(description = "공유 대상 목록") @Valid List<ScheduleTargetRequest> targets) {
}
