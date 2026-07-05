package com.flowbi.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
    @Schema(description = "리프레시 토큰") @JsonProperty("refresh_token") @NotBlank String refreshToken) {
}
