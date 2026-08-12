package com.flowbi.domain.user.dto;

public record UserDetailResponse(Long userId, String name, String status, TeamDetail team,
    PositionDetail position) {

  public record TeamDetail(Long teamId, String name) {
  }

  public record PositionDetail(Long positionId, String name) {
  }
}
