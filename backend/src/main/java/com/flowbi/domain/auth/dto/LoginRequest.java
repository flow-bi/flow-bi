package com.flowbi.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @Schema(description = "사번", example = "EMP001") @JsonProperty("employee_number") @NotBlank String employeeNumber,
    @Schema(description = "비밀번호", example = "password123") @NotBlank @Size(min = 8) String password,
    @Schema(description = "접속 기기 정보", example = "Chrome on macOS") @JsonProperty("device_info") String deviceInfo) {
}
