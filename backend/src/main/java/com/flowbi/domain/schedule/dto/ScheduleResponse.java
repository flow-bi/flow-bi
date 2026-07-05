package com.flowbi.domain.schedule.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public record ScheduleResponse(
    @Schema(description = "일정 ID") @JsonProperty("schedule_id") Long scheduleId,
    @Schema(description = "일정 제목") String title,
    @Schema(description = "일정 유형") @JsonProperty("schedule_type") ScheduleType scheduleType,
    @Schema(description = "열람 가능 범위") ScheduleVisibility visibility,
    @Schema(description = "시작 일시") @JsonProperty("start_at") LocalDateTime startAt,
    @Schema(description = "종료 일시") @JsonProperty("end_at") LocalDateTime endAt,
    @Schema(description = "등록자 ID") @JsonProperty("creator_id") Long creatorId,
    @Schema(description = "색상 라벨") @JsonProperty("color_label") String colorLabel,
    @Schema(description = "장소") String location, @Schema(description = "일정 상세 설명") String content,
    @Schema(description = "공유 대상 목록") List<ScheduleTargetResponse> targets) {
}
