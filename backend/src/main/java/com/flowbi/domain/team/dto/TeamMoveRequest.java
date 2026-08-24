package com.flowbi.domain.team.dto;

public record TeamMoveRequest(Long newParentTeamId) {

  public TeamMoveRequest {
    if (newParentTeamId != null && newParentTeamId <= 0) {
      throw new IllegalArgumentException("newParentTeamId must be positive");
    }
  }
}
