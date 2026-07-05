package com.flowbi.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

public record AuthTokenResponse(
    @Schema(description = "액세스 토큰") @JsonProperty("access_token") String accessToken,
    @Schema(description = "리프레시 토큰") @JsonProperty("refresh_token") String refreshToken,
    @Schema(description = "토큰 타입", example = "Bearer") @JsonProperty("token_type") String tokenType,
    @Schema(description = "액세스 토큰 만료까지 남은 초", example = "1800") @JsonProperty("expires_in") long expiresIn,
    @Schema(description = "로그인 사용자") AuthUserResponse user) {
}
