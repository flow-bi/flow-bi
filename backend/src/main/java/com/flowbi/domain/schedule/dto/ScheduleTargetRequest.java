package com.flowbi.domain.schedule.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.flowbi.domain.schedule.entity.ScheduleTargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ScheduleTargetRequest(
    @Schema(description = "공유 대상 유형", example = "USER") @JsonProperty("target_type") @NotNull ScheduleTargetType targetType,
    @Schema(description = "사용자 ID") @JsonProperty("user_id") Long userId,
    @Schema(description = "프로젝트 ID") @JsonProperty("project_id") Long projectId,
    @Schema(description = "공유 기준 상위 팀 ID") @JsonProperty("ancestor_team_id") Long ancestorTeamId,
    @Schema(description = "팀 ID") @JsonProperty("team_id") Long teamId) {
}
