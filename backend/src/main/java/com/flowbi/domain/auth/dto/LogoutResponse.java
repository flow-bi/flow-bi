package com.flowbi.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record LogoutResponse(@Schema(description = "폐기 완료 여부", example = "true") boolean revoked) {
}
