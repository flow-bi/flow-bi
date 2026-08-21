package com.flowbi.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "현재 인증 사용자의 헤더 표시 정보")
public record CurrentUserResponse(@Schema(description = "사용자 이름", example = "김플로우") String name) {
}
