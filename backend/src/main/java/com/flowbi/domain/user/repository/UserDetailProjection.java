package com.flowbi.domain.user.repository;

import com.flowbi.domain.user.entity.UserStatus;

public record UserDetailProjection(Long userId, String name, UserStatus status, Long teamId,
    String teamName, Long positionId, String positionName) {
}
