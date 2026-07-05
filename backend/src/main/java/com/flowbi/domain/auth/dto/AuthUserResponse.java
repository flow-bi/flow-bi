package com.flowbi.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

public record AuthUserResponse(
    @Schema(description = "사용자 ID", example = "1") @JsonProperty("user_id") Long userId,
    @Schema(description = "사번", example = "EMP001") @JsonProperty("employee_number") String employeeNumber,
    @Schema(description = "이름", example = "홍길동") String name) {
}
