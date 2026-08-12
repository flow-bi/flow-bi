package com.flowbi.domain.user.repository;

public record UserDetailProjection(Long userId, String name, String status, Long teamId,
    String teamName, Long positionId, String positionName) {
}
